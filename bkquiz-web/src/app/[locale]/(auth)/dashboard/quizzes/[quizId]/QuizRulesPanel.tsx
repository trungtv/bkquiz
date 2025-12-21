'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, TableWrap } from '@/components/ui/Table';
import { Toast } from '@/components/ui/Toast';
import { TagInput } from '@/components/ui/TagInput';

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
type QuizSettingsResponse = {
  durationSeconds?: number | null;
  variant?: { defaultExtraPercent: number };
};
type TagSuggestion = { id: string; name: string; normalizedName: string; questionCount: number };
type QuizInfo = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  createdAt: string;
};

export function QuizRulesPanel(props: { quizId: string; userId: string | null }) {
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
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
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showDefaultExtra, setShowDefaultExtra] = useState(false);
  const [poolSearchQuery, setPoolSearchQuery] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  // Tags state
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<Array<{ id: string; name: string; normalizedName: string }>>([]);
  const [tagsBusy, setTagsBusy] = useState(false);

  const poolById = useMemo(() => new Map(pools.map(p => [p.id, p])), [pools]);
  const selectedTagInfo = useMemo(
    () => tagSuggestions.find(s => s.normalizedName === tag) ?? null,
    [tagSuggestions, tag],
  );
  const projectedQuestions = mode === 'same' ? count : commonCount + variantCount;

  // Auto-adjust count nếu tag có ít câu hơn số đã nhập khi chọn tag mới
  useEffect(() => {
    if (tag && selectedTagInfo) {
      if (mode === 'same' && count > selectedTagInfo.questionCount) {
        setCount(selectedTagInfo.questionCount);
      }
      if (mode === 'variant') {
        const total = commonCount + variantCount;
        if (total > selectedTagInfo.questionCount) {
          // Giữ tỉ lệ commonCount/variantCount nhưng giảm tổng
          const ratio = total > 0 ? commonCount / total : 0.5;
          const newTotal = selectedTagInfo.questionCount;
          setCommonCount(Math.floor(newTotal * ratio));
          setVariantCount(newTotal - Math.floor(newTotal * ratio));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, selectedTagInfo?.questionCount, mode]); // Chỉ chạy khi tag/mode thay đổi
  const totalRequestedFromRules = useMemo(
    () =>
      rules.reduce((acc, r) => {
        if (typeof r.count === 'number' && r.count > 0) {
          return acc + r.count;
        }
        const common = r.commonCount ?? 0;
        const variant = r.variantCount ?? 0;
        return acc + common + variant;
      }, 0),
    [rules],
  );

  async function fetchTagSuggestions(query: string) {
    const q = query.trim();
    try {
      const url = q ? `/api/tags?q=${encodeURIComponent(q)}` : '/api/tags';
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        return;
      }
      const json = await res.json() as { tags?: TagSuggestion[] };
      setTagSuggestions(json.tags ?? []);
    } catch {
      // ignore suggestion errors – không chặn flow chính
    }
  }

  async function load() {
    setError(null);
    const [qRes, rRes, pRes] = await Promise.all([
      fetch(`/api/quizzes/${props.quizId}`, { method: 'GET' }),
      fetch(`/api/quizzes/${props.quizId}/rules`, { method: 'GET' }),
      fetch('/api/pools', { method: 'GET' }),
    ]);
    const qJson = await qRes.json() as QuizInfo & { error?: string };
    const rJson = await rRes.json() as QuizRulesResponse & { error?: string };
    const pJson = await pRes.json() as PoolsResponse & { error?: string };
    if (!qRes.ok) {
      setError(qJson.error ?? 'LOAD_QUIZ_FAILED');
      return;
    }
    if (!rRes.ok) {
      setError(rJson.error ?? 'LOAD_RULES_FAILED');
      return;
    }
    if (!pRes.ok) {
      setError(pJson.error ?? 'LOAD_POOLS_FAILED');
      return;
    }
    setQuizInfo(qJson);
    setRules(rJson.rules ?? []);
    setPools([...(pJson.owned ?? []), ...(pJson.shared ?? [])]);

    // settings (defaultExtraPercent, durationSeconds)
    const sRes = await fetch(`/api/quizzes/${props.quizId}/settings`, { method: 'GET' });
    const sJson = await sRes.json() as QuizSettingsResponse & { error?: string };
    if (sRes.ok) {
      if (sJson.variant && typeof sJson.variant.defaultExtraPercent === 'number') {
        setDefaultExtraPercent(sJson.variant.defaultExtraPercent);
      }
      if (typeof sJson.durationSeconds === 'number') {
        setDurationMinutes(Math.round(sJson.durationSeconds / 60));
      } else {
        setDurationMinutes(null);
      }
    }
  }

  async function loadTags() {
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/tags`);
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setTags(json.tags ?? []);
        setTagsInput(json.tags?.map(t => t.name).join(', ') ?? '');
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  }

  async function saveTags() {
    setTagsBusy(true);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsInput }),
      });
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setTags(json.tags ?? []);
        setToast({ message: 'Đã lưu tags thành công', type: 'success' });
      } else {
        setToast({ message: json.error ?? 'Lỗi khi lưu tags', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving tags:', err);
      setToast({ message: 'Lỗi khi lưu tags', type: 'error' });
    } finally {
      setTagsBusy(false);
    }
  }

  useEffect(() => {
    void load();
    void fetchTagSuggestions('');
    void loadTags();
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
      if (!res.ok) {
        let errorMessage = 'SAVE_FAILED';
        try {
          const errorJson = await res.json() as { error?: string };
          errorMessage = errorJson.error ?? 'SAVE_FAILED';
        } catch {
          // Response không phải JSON, dùng message mặc định
        }
        setError(errorMessage);
        setToast({ message: 'Không thể lưu lượt chọn câu', type: 'error' });
        return;
      }
      const json = await res.json() as { ok?: boolean; rule?: any; error?: string };
      if (!json.ok) {
        setError(json.error ?? 'SAVE_FAILED');
        setToast({ message: 'Không thể lưu lượt chọn câu', type: 'error' });
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
      setToast({ message: 'Đã lưu lượt chọn câu thành công', type: 'success' });
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
        setToast({ message: 'Không thể lưu cài đặt', type: 'error' });
        return;
      }
      setToast({ message: 'Đã lưu cài đặt mặc định', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveDuration() {
    if (durationMinutes === null || durationMinutes < 1) {
      setToast({ message: 'Vui lòng nhập thời gian làm bài (tối thiểu 1 phút)', type: 'error' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/settings`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ durationSeconds: durationMinutes * 60 }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'SAVE_DURATION_FAILED');
        setToast({ message: 'Không thể lưu thời gian làm bài', type: 'error' });
        return;
      }
      setToast({ message: 'Đã lưu thời gian làm bài', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!quizInfo || quizInfo.status !== 'draft') {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${props.quizId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'PUBLISH_FAILED');
        setToast({ message: 'Không thể publish quiz', type: 'error' });
        return;
      }
      setToast({ message: 'Đã publish quiz thành công', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/dashboard/quizzes" className="hover:text-text-heading">
            Quizzes
          </Link>
          {quizInfo && (
            <>
              <span>·</span>
              <span className="text-text-heading truncate">{quizInfo.title}</span>
            </>
          )}
        </div>
      </nav>

      {/* Quiz Header */}
      {quizInfo && (
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-text-heading truncate">
                  {quizInfo.title}
                </h1>
                <Badge
                  variant={
                    quizInfo.status === 'published'
                      ? 'success'
                      : quizInfo.status === 'archived'
                        ? 'neutral'
                        : 'info'
                  }
                >
                  {quizInfo.status}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                <span>
                  Cập nhật:
                  {' '}
                  {formatDate(quizInfo.updatedAt)}
                </span>
                <span>·</span>
                <span className="font-mono text-xs">
                  ID:
                  {' '}
                  {quizInfo.id.slice(0, 8)}
                  ...
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/quizzes">
                <Button variant="ghost" size="sm">
                  ← Quay lại
                </Button>
              </Link>
              {quizInfo.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handlePublish()}
                  disabled={busy || rules.length === 0}
                >
                  Publish Quiz
                </Button>
              )}
            </div>
          </div>
          {error
            ? (
                <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                  {error}
                </div>
              )
            : null}
        </Card>
      )}

      {/* Tags Section */}
      {quizInfo && (
        <Card className="p-5 md:p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-heading">
              Tags (comma-separated)
            </label>
            <TagInput
              value={tagsInput}
              onChange={setTagsInput}
              onSave={saveTags}
              tags={tags}
              showSaveButton={true}
              disabled={tagsBusy}
              placeholder="midterm, 2025, practice..."
            />
          </div>
        </Card>
      )}

      {/* Rules List - Hiển thị trước */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-text-heading">Các lượt chọn câu (rules hiện tại)</div>
            <div className="mt-1 text-sm text-text-muted">
              Tổng số câu dự kiến:
              {' '}
              <span className="font-mono text-base font-semibold text-text-heading">{totalRequestedFromRules}</span>
              {' '}
              câu
            </div>
          </div>
        </div>
        {rules.length === 0
          ? (
              <div className="mt-6 py-8 text-center">
                <div className="text-sm text-text-muted">
                  Chưa có lượt chọn câu nào.
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Bấm "Mở rộng" ở khung "Thêm lượt chọn câu mới" bên dưới để bắt đầu.
                </div>
              </div>
            )
          : (
              <div className="mt-4 space-y-2">
                {rules.map((r) => {
                  const ruleMode: 'same' | 'variant' = (r.commonCount ?? 0) > 0 || (r.variantCount ?? 0) > 0 ? 'variant' : 'same';
                  const questionCount = ruleMode === 'same' ? (r.count ?? 0) : ((r.commonCount ?? 0) + (r.variantCount ?? 0));
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border border-border-subtle bg-bg-section transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-4 md:grid-cols-[120px_100px_auto]">
                          <Badge variant="info" className="text-xs">
                            {r.tag.name}
                          </Badge>
                          <span className="text-sm font-medium text-text-heading">
                            {questionCount}
                            {' '}
                            câu
                          </span>
                          <Badge variant={ruleMode === 'variant' ? 'warning' : 'neutral'} className="text-xs">
                            {ruleMode === 'variant' ? 'Variant-set' : 'Same-set'}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          className="flex-shrink-0 text-sm text-text-muted transition-colors hover:text-danger"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError(null);
                            try {
                              const res = await fetch(
                                `/api/quizzes/${props.quizId}/rules?ruleId=${encodeURIComponent(r.id)}`,
                                { method: 'DELETE' },
                              );
                              const json = await res.json() as { error?: string };
                              if (!res.ok) {
                                setError(json.error ?? 'DELETE_FAILED');
                                setToast({ message: 'Không thể xóa lượt chọn', type: 'error' });
                                return;
                              }
                              setToast({ message: 'Đã xóa lượt chọn thành công', type: 'success' });
                              await load();
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
      </Card>

      {/* Quiz Settings - Time Limit */}
      <Card className="p-5 md:p-6">
        <div className="text-lg font-semibold text-text-heading">Bước 1 - Cài đặt quiz</div>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-heading" htmlFor="durationMinutes">
              Thời gian làm bài (phút)
            </label>
            <div className="flex items-center gap-3">
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                max={1440}
                value={durationMinutes ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setDurationMinutes(val);
                }}
                placeholder="VD: 60 (1 giờ)"
                disabled={busy}
                className="w-32"
              />
              <span className="text-sm text-text-muted">
                {durationMinutes !== null && durationMinutes > 0
                  ? (
                      <>
                        (
                        {durationMinutes >= 60
                          ? `${Math.floor(durationMinutes / 60)} giờ ${durationMinutes % 60 > 0 ? `${durationMinutes % 60} phút` : ''}`
                          : `${durationMinutes} phút`}
                        )
                      </>
                    )
                  : 'Không giới hạn thời gian'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void saveDuration()}
                disabled={busy || durationMinutes === null || durationMinutes < 1}
              >
                Lưu
              </Button>
            </div>
            <div className="text-xs text-text-muted">
              Thời gian tối đa để sinh viên hoàn thành quiz. Để trống nếu không giới hạn.
            </div>
          </div>
        </div>
      </Card>

      {/* Rule Builder */}
      <Card className="p-5 md:p-6">
        <div className="text-lg font-semibold text-text-heading">Bước 2 – Chọn câu cho đề (rule theo tag/pool)</div>
        <div className="mt-4 grid gap-4">
          {/* 1) Tỉ lệ dự phòng mặc định - Collapse/Expand */}
          <div className="rounded-md border border-border-subtle bg-bg-section">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm"
              onClick={() => setShowDefaultExtra(!showDefaultExtra)}
            >
              <span className="text-text-muted">
                Tỉ lệ câu dự phòng mặc định (quiz-level)
                {' '}
                <span className="text-xs">
                  (Hiện tại:
                  {' '}
                  <span className="font-mono">{defaultExtraPercent}</span>
                  )
                </span>
              </span>
              <span className="text-text-muted">
                {showDefaultExtra ? '▲' : '▼'}
              </span>
            </button>
            {showDefaultExtra && (
              <div className="border-t border-border-subtle px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex-1" htmlFor="defaultExtraPercent">
                    <div className="text-sm font-medium text-text-heading">Tỉ lệ câu dự phòng mặc định (%)</div>
                    <Input
                      id="defaultExtraPercent"
                      type="number"
                      step="0.05"
                      className="mt-1"
                      value={defaultExtraPercent}
                      onChange={e => setDefaultExtraPercent(Number(e.target.value))}
                      disabled={busy}
                      min={0}
                      max={5}
                    />
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => void saveDefaultExtra()} disabled={busy}>
                    Lưu default
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2) Chọn pools trước */}
          <div className="grid gap-2">
            <div className="text-sm font-medium text-text-heading">Ngân hàng câu hỏi (pools) – có thể chọn nhiều</div>
            {pools.length > 5 && (
              <Input
                placeholder="Tìm kiếm pool..."
                value={poolSearchQuery}
                onChange={e => setPoolSearchQuery(e.target.value)}
                className="text-sm"
              />
            )}
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border-subtle bg-bg-section p-3">
              {pools.length === 0
                ? (
                    <div className="text-sm text-text-muted">Chưa có pool nào.</div>
                  )
                : pools
                    .filter(p => poolSearchQuery.trim() === '' || p.name.toLowerCase().includes(poolSearchQuery.toLowerCase()))
                    .map(p => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm transition-colors hover:bg-bg-cardHover"
                      >
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
                          className="h-4 w-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text-heading">{p.name}</div>
                          <div className="text-xs text-text-muted">
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
                        {selectedPoolIds.includes(p.id) && (
                          <span className="text-xs text-primary">✓</span>
                        )}
                      </label>
                    ))}
            </div>
            <div className="text-xs text-text-muted">
              {selectedPoolIds.length === 0
                ? (
                    <>
                      Chưa chọn pool nào. Lượt này sẽ lấy câu từ
                      {' '}
                      <strong>tất cả pools</strong>
                      .
                    </>
                  )
                : (
                    <>
                      Đã chọn
                      {' '}
                      <strong>
                        {selectedPoolIds.length}
                        {' '}
                        pool
                      </strong>
                      .
                    </>
                  )}
            </div>
          </div>

          {/* 3) Sau đó chọn chủ đề (tag) bằng cách bấm chọn trong danh sách */}
          <div className="grid gap-1 text-sm">
            <div className="font-medium text-text-heading">Chủ đề (tag)</div>
            <div className="flex flex-wrap gap-2">
              {tagSuggestions.length === 0
                ? (
                    <div className="text-xs text-text-muted">
                      Chưa có tag nào. Thêm tag cho câu hỏi trong Question Bank trước.
                    </div>
                  )
                : tagSuggestions.map((s) => {
                    const selected = tag === s.normalizedName;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border-subtle bg-bg-section text-text-body hover:bg-bg-card'
                        }`}
                        onClick={() => {
                          setTag(selected ? '' : s.normalizedName);
                        }}
                        disabled={busy}
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="font-mono text-[10px] text-text-muted">
                          (
                          {s.questionCount}
                          {' '}
                          câu)
                        </span>
                      </button>
                    );
                  })}
            </div>
            <div className="text-xs text-text-muted">
              {tag
                ? (
                    <>
                      Đang chọn tag:
                      {' '}
                      <span className="font-mono">{tag}</span>
                      . Mỗi lượt chọn hiện tại dùng 1 chủ đề chính.
                    </>
                  )
                : 'Bấm chọn 1 chủ đề để áp dụng cho lượt chọn này.'}
            </div>
          </div>

          <label className="grid gap-1 text-sm" htmlFor="ruleMode">
            <div className="font-medium text-text-heading">Kiểu đề</div>
            <select
              id="ruleMode"
              className="rounded-md border border-border-subtle bg-bg-section px-3 py-2 text-text-body"
              value={mode}
              onChange={e => setMode(e.target.value as 'same' | 'variant')}
              disabled={busy}
            >
              <option value="same">Một đề giống nhau cho tất cả sinh viên (same-set)</option>
              <option value="variant">Nhiều phiên bản đề (variant-set)</option>
            </select>
          </label>

          {mode === 'same' && (
            <label className="grid gap-1 text-sm" htmlFor="ruleCount">
              <div className="font-medium text-text-heading">
                Số câu cần lấy (nếu dùng một đề chung)
                {tag && selectedTagInfo && (
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    (Tối đa:
                    {' '}
                    <span className="font-mono">{selectedTagInfo.questionCount}</span>
                    {' '}
                    câu)
                  </span>
                )}
              </div>
              <Input
                id="ruleCount"
                type="number"
                value={count}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const max = tag && selectedTagInfo ? selectedTagInfo.questionCount : 500;
                  setCount(Math.min(val, max));
                }}
                disabled={busy}
                min={1}
                max={tag && selectedTagInfo ? selectedTagInfo.questionCount : 500}
              />
              {tag && selectedTagInfo && count > selectedTagInfo.questionCount && (
                <div className="text-xs text-warning">
                  Số câu yêu cầu (
                  {count}
                  ) vượt quá số câu có sẵn (
                  {selectedTagInfo.questionCount}
                  ). Đã tự động điều chỉnh.
                </div>
              )}
            </label>
          )}

          {mode === 'variant'
            ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm" htmlFor="commonCount">
                    <div className="font-medium text-text-heading">
                      Số câu chung cho mọi đề (commonCount)
                      {tag && selectedTagInfo && (
                        <span className="ml-2 text-xs font-normal text-text-muted">
                          (Tối đa:
                          {' '}
                          <span className="font-mono">{selectedTagInfo.questionCount}</span>
                          )
                        </span>
                      )}
                    </div>
                    <Input
                      id="commonCount"
                      type="number"
                      value={commonCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const max = tag && selectedTagInfo ? selectedTagInfo.questionCount : 500;
                        setCommonCount(Math.min(val, max));
                      }}
                      disabled={busy}
                      min={0}
                      max={tag && selectedTagInfo ? selectedTagInfo.questionCount : 500}
                    />
                  </label>
                  <label className="grid gap-1 text-sm" htmlFor="variantCount">
                    <div className="font-medium text-text-heading">
                      Số câu riêng cho mỗi đề (variantCount)
                      {tag && selectedTagInfo && (
                        <span className="ml-2 text-xs font-normal text-text-muted">
                          (Tối đa:
                          {' '}
                          <span className="font-mono">{selectedTagInfo.questionCount}</span>
                          )
                        </span>
                      )}
                    </div>
                    <Input
                      id="variantCount"
                      type="number"
                      value={variantCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const max = tag && selectedTagInfo ? selectedTagInfo.questionCount : 500;
                        setVariantCount(Math.min(val, max));
                      }}
                      disabled={busy}
                      min={0}
                      max={tag && selectedTagInfo ? selectedTagInfo.questionCount : 500}
                    />
                  </label>
                  <label className="grid gap-1 text-sm" htmlFor="extraPercent">
                    <div className="font-medium text-text-heading">Tỉ lệ câu dự phòng cho đề biến thể (extraPercent)</div>
                    <Input
                      id="extraPercent"
                      type="number"
                      step="0.05"
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

          <div className="mt-2 text-xs">
            <div className="text-text-muted">
              Lượt này dự kiến sẽ lấy
              {' '}
              <span className="font-mono">{projectedQuestions}</span>
              {' '}
              câu từ các pool / tag đã chọn (thực tế còn phụ thuộc vào số câu có trong ngân hàng).
            </div>
            {tag && selectedTagInfo && projectedQuestions > selectedTagInfo.questionCount && (
              <div className="mt-1 text-warning">
                ⚠️ Số câu yêu cầu (
                <span className="font-mono">{projectedQuestions}</span>
                ) vượt quá số câu có sẵn trong tag này (
                <span className="font-mono">{selectedTagInfo.questionCount}</span>
                ). Vui lòng điều chỉnh.
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="primary"
              disabled={
                busy
                || tag.trim().length === 0
                || (mode === 'same' ? count < 1 : (commonCount + variantCount) < 1)
              }
              onClick={() => void saveRule()}
            >
              {busy ? 'Đang lưu...' : 'Xong lượt chọn này'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Card - Hiển thị sau cùng */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-text-heading">Preview đủ/thiếu theo rule</div>
          <Button size="sm" variant="ghost" onClick={() => void loadPreview()} disabled={busy}>
            Preview
          </Button>
        </div>
        {preview
          ? (
              <div className="mt-3 overflow-x-auto">
                <div className="mb-2 text-sm text-text-heading">
                  Tổng số câu yêu cầu:
                  {' '}
                  <span className="font-mono">{preview.totals.totalRequested}</span>
                  {' '}
                  · Tổng số câu cần lấy (có dự phòng):
                  {' '}
                  <span className="font-mono">{preview.totals.totalPoolSize}</span>
                  {' '}
                  · Thiếu:
                  {' '}
                  <span className="font-mono">{preview.totals.totalShortage}</span>
                </div>
                <div className="mb-2 text-xs text-text-muted">
                  <strong>Giải thích:</strong>
                  {' '}
                  Với
                  {' '}
                  <strong>same-set</strong>
                  : "Số câu cần lấy" = số câu yêu cầu (không có dự phòng).
                  {' '}
                  Với
                  {' '}
                  <strong>variant-set</strong>
                  : "Số câu cần lấy" = số câu yêu cầu + phần dự phòng (extraPercent) để đảm bảo có đủ câu tạo nhiều variant.
                  {' '}
                  "Thiếu" = số câu cần lấy - số câu có sẵn trong pool.
                </div>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr className="text-text-muted">
                        <th className="border-b p-2">Tag</th>
                        <th className="border-b p-2">Yêu cầu</th>
                        <th className="border-b p-2">Cần lấy (có dự phòng)</th>
                        <th className="border-b p-2">Có sẵn</th>
                        <th className="border-b p-2">Thiếu</th>
                        <th className="border-b p-2">Pools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map(r => (
                        <tr
                          key={r.ruleId}
                          className={r.shortage > 0
                            ? 'bg-warning/10'
                            : 'odd:bg-bg-elevated'}
                        >
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
                  </Table>
                </TableWrap>
              </div>
            )
          : (
              <div className="mt-2 text-sm text-text-muted">
                Bấm "Preview" để kiểm tra đủ/thiếu câu theo từng tag/pool trước khi tạo session.
              </div>
            )}
      </Card>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
// EOF
