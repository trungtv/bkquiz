'use client';

import { useMemo, useState } from 'react';

type Pool = {
  id: string;
  name: string;
  visibility: 'private' | 'shared';
  updatedAt: string | Date;
};

export function QuestionBankPanel(props: { initialOwned: Pool[] }) {
  const [owned, setOwned] = useState<Pool[]>(props.initialOwned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const sorted = useMemo(
    () => [...owned].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [owned],
  );

  async function refresh() {
    const res = await fetch('/api/pools', { method: 'GET' });
    if (!res.ok) {
      return;
    }
    const data = await res.json() as { owned: Pool[] };
    setOwned(data.owned);
  }

  async function importFile() {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/pools/import', { method: 'POST', body: form });
      const raw = await res.text();
      const data = (() => {
        try {
          return JSON.parse(raw) as { error?: string; warnings?: string[] };
        } catch {
          return { error: raw || 'EMPTY_RESPONSE' };
        }
      })();
      if (!res.ok) {
        setError(data.error ?? 'IMPORT_FAILED');
        return;
      }
      if (data.warnings?.length) {
        setError(`Imported with warnings: ${data.warnings.slice(0, 3).join(' | ')}`);
      }
      setFile(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Question Bank</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Import (.md hoặc .zip)</div>
            <input
              type="file"
              accept=".md,.zip"
              className="mt-2 block w-full text-sm"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <div className="mt-1 text-xs text-gray-500">
              ZIP yêu cầu có file
              {' '}
              <span className="font-mono">questions.md</span>
              {' '}
              ở root hoặc trong folder.
            </div>
          </div>
          <button
            type="button"
            onClick={importFile}
            disabled={busy || !file}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Đang import...' : 'Import'}
          </button>
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
        <div className="text-lg font-semibold">Pools của bạn</div>
        <div className="mt-3 grid gap-2">
          {sorted.length === 0
            ? (
                <div className="text-sm text-gray-600">Chưa có pool nào.</div>
              )
            : (
                sorted.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-sm text-gray-600">
                        Visibility:
                        {' '}
                        <span className="font-mono">{p.visibility}</span>
                      </div>
                    </div>
                    <a
                      className="text-sm font-medium text-blue-700 hover:underline"
                      href={`/dashboard/question-bank/${p.id}`}
                    >
                      Mở
                    </a>
                  </div>
                ))
              )}
        </div>
      </div>
    </div>
  );
}
