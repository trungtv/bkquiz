'use client';

import { useEffect, useMemo, useState } from 'react';

type PoolLite = { id: string; name: string; visibility: 'private' | 'shared'; permission?: 'view' | 'use' | 'edit' };
type RuleRow = {
  id: string;
  count: number | null;
  commonCount: number | null;
  variantCount: number | null;
  extraPercent: number | null;
  filters: any;
  tag: { id: string; name: string; normalizedName: string };
};
type QuizRulesResponse = { rules: RuleRow[] };
type PoolsResponse = { owned: PoolLite[]; shared: PoolLite[] };
type QuizSettingsResponse = { variant?: { defaultExtraPercent: number } };

export function QuizRulesPanel(props: { quizId: string; userId: string | null }) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [pools, setPools] = useState<PoolLite[]>([]);
  const [preview, setPreview] = useState<null | {
    totals: { totalRequested: number; totalPoolSize: number; totalShortage: number };
    rows: Array<{
      ruleId: string;
      tag: { name: string; normalizedName: string };
      requested: number;
      poolSize: number;
      available: number;
      shortage: number;
      poolIds: string[];
    }>;
  }>(null);
  const [tag, setTag] = useState('');
  const [mode, setMode] = useState<'same' | 'variant'>('same');
  const [count, setCount] = useState(5);
  const [commonCount, setCommonCount] = useState(5);
  const [variantCount, setVariantCount] = useState(1);
  const [extraPercent, setExtraPercent] = useState(0.2);
  const [defaultExtraPercent, setDefaultExtraPercent] = useState(0.2);
  const [useDefaultExtra, setUseDefaultExtra] = useState(true);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poolById = useMemo(() => new Map(pools.map(p => [p.id, p])), [pools]);

  async function load() {
    setError(null);
    const [rRes, pRes] = await Promise.all([
      fetch(`/api/quizzes/${props.quizId}/rules`, { method: 'GET' }),
      fetch('/api/pools', { method: 'GET' }),
    ]);
    const rJson = await rRes.json() as QuizRulesResponse & { error?: string };
    const pJson = await pRes.json() as PoolsResponse & { error?: string };
    if (!rRes.ok) {
      setError(rJson.error ?? 'LOAD_RULES_FAILED');
      return;
    }
    if (!pRes.ok) {
      setError(pJson.error ?? 'LOAD_POOLS_FAILED');
      return;
    }
    setRules(rJson.rules ?? []);
    setPools([...(pJson.owned ?? []), ...(pJson.shared ?? [])]);

    // settings (defaultExtraPercent)
    const sRes = await fetch(`/api/quizzes/${props.quizId}/settings`, { method: 'GET' });
    const sJson = await sRes.json() as QuizSettingsResponse & { error?: string };
    if (sRes.ok && sJson.variant && typeof sJson.variant.defaultExtraPercent === 'number') {
      setDefaultExtraPercent(sJson.variant.defaultExtraPercent);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.quizId]);

  async function saveRule() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/rules`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tag,
          mode,
          count: mode === 'same' ? count : undefined,
          commonCount: mode === 'variant' ? commonCount : undefined,
          variantCount: mode === 'variant' ? variantCount : undefined,
          extraPercent: (mode === 'variant' && !useDefaultExtra) ? extraPercent : undefined,
          poolIds: selectedPoolIds,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'SAVE_FAILED');
        return;
      }
      setTag('');
      setMode('same');
      setCount(5);
      setCommonCount(5);
      setVariantCount(1);
      setExtraPercent(0.2);
      setUseDefaultExtra(true);
      setSelectedPoolIds([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveDefaultExtra() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/settings`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variant: { defaultExtraPercent } }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'SAVE_SETTINGS_FAILED');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/preview`, { method: 'GET' });
      const json = await res.json() as any;
      if (!res.ok) {
        setError(json.error ?? 'PREVIEW_FAILED');
        return;
      }
      setPreview({ totals: json.totals, rows: json.rows });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Quiz Rules (same-set)</div>
        <div className="mt-1 text-sm text-gray-600">
          Quiz:
          {' '}
          <span className="font-mono">{props.quizId}</span>
        </div>
        {error
          ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )
          : null}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Preview đủ/thiếu theo rule</div>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => void loadPreview()}
            disabled={busy}
          >
            Preview
          </button>
        </div>
        {preview
          ? (
              <div className="mt-3 overflow-x-auto">
                <div className="mb-2 text-sm text-gray-700">
                  Tổng requested:
                  {' '}
                  <span className="font-mono">{preview.totals.totalRequested}</span>
                  {' '}
                  · tổng poolSize:
                  {' '}
                  <span className="font-mono">{preview.totals.totalPoolSize}</span>
                  {' '}
                  · thiếu:
                  {' '}
                  <span className="font-mono">{preview.totals.totalShortage}</span>
                </div>
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="border-b p-2">Tag</th>
                      <th className="border-b p-2">Requested</th>
                      <th className="border-b p-2">PoolSize</th>
                      <th className="border-b p-2">Available</th>
                      <th className="border-b p-2">Shortage</th>
                      <th className="border-b p-2">Pools</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(r => (
                      <tr key={r.ruleId} className={r.shortage > 0 ? 'bg-amber-50' : 'odd:bg-gray-50'}>
                        <td className="p-2 font-mono">{r.tag.normalizedName}</td>
                        <td className="p-2 font-mono">{r.requested}</td>
                        <td className="p-2 font-mono">{r.poolSize}</td>
                        <td className="p-2 font-mono">{r.available}</td>
                        <td className="p-2 font-mono">{r.shortage}</td>
                        <td className="p-2 text-xs">
                          {r.poolIds.length === 0
                            ? <span className="font-mono">ALL</span>
                            : r.poolIds.map(id => poolById.get(id)?.name ?? id).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          : (
              <div className="mt-2 text-sm text-gray-600">
                Bấm “Preview” để kiểm tra đủ/thiếu câu theo từng tag/pool trước khi tạo session.
              </div>
            )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Thêm / cập nhật rule theo tag</div>
        <div className="mt-3 grid gap-3">
          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            <div className="font-medium text-gray-700">Variant default extraPercent (quiz-level)</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1">
                <div className="text-sm font-medium text-gray-700">defaultExtraPercent</div>
                <input
                  type="number"
                  step="0.05"
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={defaultExtraPercent}
                  onChange={e => setDefaultExtraPercent(Number(e.target.value))}
                  disabled={busy}
                  min={0}
                  max={5}
                />
              </label>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                onClick={() => void saveDefaultExtra()}
                disabled={busy}
              >
                Lưu default
              </button>
            </div>
          </div>

          <label className="grid gap-1 text-sm">
            <div className="font-medium text-gray-700">Tag</div>
            <input
              className="rounded-md border px-3 py-2"
              value={tag}
              onChange={e => setTag(e.target.value)}
              disabled={busy}
              placeholder="VD: dsa"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <div className="font-medium text-gray-700">Mode</div>
            <select
              className="rounded-md border px-3 py-2"
              value={mode}
              onChange={e => setMode(e.target.value as 'same' | 'variant')}
              disabled={busy}
            >
              <option value="same">same-set</option>
              <option value="variant">variant-set</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <div className="font-medium text-gray-700">Số câu (count)</div>
            <input
              type="number"
              className="rounded-md border px-3 py-2"
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              disabled={busy || mode !== 'same'}
              min={1}
              max={500}
            />
          </label>

          {mode === 'variant'
            ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    <div className="font-medium text-gray-700">commonCount</div>
                    <input
                      type="number"
                      className="rounded-md border px-3 py-2"
                      value={commonCount}
                      onChange={e => setCommonCount(Number(e.target.value))}
                      disabled={busy}
                      min={0}
                      max={500}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <div className="font-medium text-gray-700">variantCount</div>
                    <input
                      type="number"
                      className="rounded-md border px-3 py-2"
                      value={variantCount}
                      onChange={e => setVariantCount(Number(e.target.value))}
                      disabled={busy}
                      min={0}
                      max={500}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <div className="font-medium text-gray-700">extraPercent</div>
                    <input
                      type="number"
                      step="0.05"
                      className="rounded-md border px-3 py-2"
                      value={extraPercent}
                      onChange={e => setExtraPercent(Number(e.target.value))}
                      disabled={busy || useDefaultExtra}
                      min={0}
                      max={5}
                    />
                  </label>
                </div>
              )
            : null}
          {mode === 'variant'
            ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useDefaultExtra}
                    onChange={e => setUseDefaultExtra(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    Dùng default extraPercent của quiz (
                    <span className="font-mono">{defaultExtraPercent}</span>
                    )
                  </span>
                </label>
              )
            : null}

          <div className="text-sm font-medium text-gray-700">Chọn pools (có thể chọn nhiều)</div>
          <div className="grid gap-2 md:grid-cols-2">
            {pools.length === 0
              ? (
                  <div className="text-sm text-gray-600">Chưa có pool nào.</div>
                )
              : pools.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      aria-label={`pool:${p.name}`}
                      type="checkbox"
                      checked={selectedPoolIds.includes(p.id)}
                      onChange={(e) => {
                        setSelectedPoolIds((prev) => {
                          if (e.target.checked) {
                            return [...prev, p.id];
                          }
                          return prev.filter(x => x !== p.id);
                        });
                      }}
                      disabled={busy}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-xs text-gray-600">
                        <span className="font-mono">{p.visibility}</span>
                        {p.permission
                          ? (
                              <>
                                {' '}
                                ·
                                {' '}
                                <span className="font-mono">{p.permission}</span>
                              </>
                            )
                          : null}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
          <div className="text-xs text-gray-500">
            Nếu không chọn pool nào, rule sẽ lấy từ
            {' '}
            <strong>tất cả pools</strong>
            {' '}
            (MVP).
          </div>

          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy || tag.trim().length === 0 || (mode === 'same' ? count < 1 : (commonCount + variantCount) < 1)}
            onClick={() => void saveRule()}
          >
            {busy ? 'Đang lưu...' : 'Lưu rule'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Rules hiện tại</div>
        <div className="mt-3 grid gap-2">
          {rules.length === 0
            ? (
                <div className="text-sm text-gray-600">Chưa có rule nào.</div>
              )
            : (
                rules.map((r) => {
                  const poolIds: string[] = (r.filters?.poolIds ?? []) as string[];
                  const ruleMode: 'same' | 'variant' = (r.commonCount ?? 0) > 0 || (r.variantCount ?? 0) > 0 ? 'variant' : 'same';
                  return (
                    <div key={r.id} className="rounded-md border p-3">
                      <div className="text-sm">
                        Tag:
                        {' '}
                        <span className="font-mono">{r.tag.normalizedName}</span>
                        {' '}
                        · mode:
                        {' '}
                        <span className="font-mono">{ruleMode}</span>
                        {ruleMode === 'same'
                          ? (
                              <>
                                {' '}
                                · count:
                                {' '}
                                <span className="font-mono">{r.count ?? 0}</span>
                              </>
                            )
                          : (
                              <>
                                {' '}
                                · common:
                                {' '}
                                <span className="font-mono">{r.commonCount ?? 0}</span>
                                {' '}
                                · variant:
                                {' '}
                                <span className="font-mono">{r.variantCount ?? 0}</span>
                                {' '}
                                · extra:
                                {' '}
                                <span className="font-mono">{r.extraPercent ?? 0}</span>
                              </>
                            )}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Pools:
                        {' '}
                        {poolIds.length === 0
                          ? <span className="font-mono">ALL</span>
                          : poolIds.map(id => poolById.get(id)?.name ?? id).join(', ')}
                      </div>
                    </div>
                  );
                })
              )}
        </div>
      </div>
    </div>
  );
}
// EOF
