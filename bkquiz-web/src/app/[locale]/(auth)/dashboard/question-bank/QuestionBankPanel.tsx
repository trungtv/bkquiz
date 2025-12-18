'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

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
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-text-heading">Question Bank</div>
            <div className="mt-1 text-sm text-text-muted">
              Quản lý question pools và import nhanh câu hỏi từ Markdown/ZIP.
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="text-sm font-medium text-text-heading">Import (.md hoặc .zip)</div>
            <input
              type="file"
              accept=".md,.zip"
              className="mt-2 block w-full text-sm"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <div className="mt-1 text-xs text-text-muted">
              ZIP cần chứa file
              {' '}
              <span className="font-mono">questions.md</span>
              {' '}
              (xem chi tiết ở
              {' '}
              <span className="font-mono">docs/import.md</span>
              ).
            </div>
          </div>
          <Button variant="primary" onClick={importFile} disabled={busy || !file}>
            {busy ? 'Đang import...' : 'Import'}
          </Button>
        </div>

        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      <Card className="p-5">
        <div className="text-base font-semibold text-text-heading">Pools của bạn</div>
        <div className="mt-1 text-sm text-text-muted">
          Bao gồm các pools bạn sở hữu; có thể dùng trong quiz rules và sessions.
        </div>
        <div className="mt-4 grid gap-2">
          {busy && sorted.length === 0
            ? (
                <div className="grid gap-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              )
              : sorted.length === 0
              ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
                    Chưa có pool nào.
                    {' '}
                    <span className="font-medium text-text-heading">
                      Hãy import từ Markdown/ZIP hoặc tạo pool mới (phase sau).
                    </span>
                  </div>
                )
              : sorted.map(p => (
                  <Card
                    key={p.id}
                    interactive
                    className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3"
                    onClick={() => {
                      window.location.href = `/dashboard/question-bank/${p.id}`;
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-heading">{p.name}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        <span className="font-mono">{p.visibility}</span>
                        {' · cập nhật: '}
                        <span className="font-mono">
                          {new Date(p.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/question-bank/${p.id}`;
                      }}
                    >
                      Mở
                    </Button>
                  </Card>
                ))}
        </div>
      </Card>
    </div>
  );
}
