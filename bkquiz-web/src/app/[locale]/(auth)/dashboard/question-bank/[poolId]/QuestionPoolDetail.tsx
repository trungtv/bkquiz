'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Pool = {
  id: string;
  name: string;
  visibility: 'private' | 'shared';
};

type Question = {
  id: string;
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  options: Array<{ order: number; content: string; isCorrect: boolean }>;
  tags: Array<{ name: string; normalizedName: string }>;
};

type Share = {
  permission: 'view' | 'use' | 'edit';
  sharedWithTeacher: { id: string; email: string | null; name: string | null };
};

export function QuestionPoolDetail(props: { poolId: string; userId: string | null }) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qType, setQType] = useState<'mcq_single' | 'mcq_multi'>('mcq_single');
  const [qPrompt, setQPrompt] = useState('');
  const [qTags, setQTags] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);

  const [shareEmail, setShareEmail] = useState('');
  const [sharePerm, setSharePerm] = useState<'view' | 'use' | 'edit'>('use');

  const options = useMemo(() => {
    const raw = [optA, optB, optC, optD].map(s => s.trim());
    return raw.filter(Boolean);
  }, [optA, optB, optC, optD]);

  async function loadAll() {
    setError(null);
    const [p, q, s] = await Promise.all([
      fetch(`/api/pools/${props.poolId}`).then(r => r.json()),
      fetch(`/api/pools/${props.poolId}/questions`).then(r => r.json()),
      fetch(`/api/pools/${props.poolId}/share`).then(async r => (r.ok ? r.json() : ({ shares: [] }))),
    ]);
    if (p?.error) {
      setError(p.error);
      return;
    }
    setPool(p);
    setQuestions(q.questions ?? []);
    setShares(s.shares ?? []);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.poolId]);

  async function addQuestion() {
    setBusy(true);
    setError(null);
    try {
      if (options.length < 2) {
        setError('Need at least 2 options.');
        return;
      }
      const res = await fetch(`/api/pools/${props.poolId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: qType,
          prompt: qPrompt,
          options: options.map((c, idx) => ({ content: c, isCorrect: qType === 'mcq_single' ? idx === correctIdx : false })),
          tags: qTags.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'ADD_FAILED');
        return;
      }
      setQPrompt('');
      setQTags('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setCorrectIdx(0);
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function sharePool() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail, permission: sharePerm }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'SHARE_FAILED');
        return;
      }
      setShareEmail('');
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="text-lg font-semibold">
          Pool:
          {' '}
          <span className="font-mono">{props.poolId}</span>
        </div>
        <div className="mt-2 text-sm text-text-body">
          {pool
            ? (
                <>
                  <span className="font-medium">{pool.name}</span>
                  {' '}
                  (
                  <span className="font-mono">{pool.visibility}</span>
                  )
                </>
              )
            : (
                <span className="text-text-muted">Loading...</span>
              )}
        </div>
        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-lg font-semibold">Thêm câu hỏi (quick)</div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm">
              <div className="font-medium text-text-heading">Type</div>
              <select
                className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                value={qType}
                onChange={e => setQType(e.target.value as 'mcq_single' | 'mcq_multi')}
                disabled={busy}
              >
                <option value="mcq_single">mcq_single</option>
                <option value="mcq_multi">mcq_multi</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <div className="font-medium text-text-heading">Prompt</div>
              <textarea
                className="min-h-24 rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                value={qPrompt}
                onChange={e => setQPrompt(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <div className="font-medium text-text-heading">Tags (comma-separated)</div>
              <input
                className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                value={qTags}
                onChange={e => setQTags(e.target.value)}
                disabled={busy}
              />
            </label>

            <div className="grid gap-2">
              <div className="text-sm font-medium text-text-heading">Options</div>
              <input className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body" value={optA} onChange={e => setOptA(e.target.value)} disabled={busy} placeholder="A" />
              <input className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body" value={optB} onChange={e => setOptB(e.target.value)} disabled={busy} placeholder="B" />
              <input className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body" value={optC} onChange={e => setOptC(e.target.value)} disabled={busy} placeholder="C (optional)" />
              <input className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body" value={optD} onChange={e => setOptD(e.target.value)} disabled={busy} placeholder="D (optional)" />
            </div>

            {qType === 'mcq_single'
              ? (
                  <label className="grid gap-1 text-sm">
                    <div className="font-medium text-text-heading">Correct option</div>
                    <select
                      className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                      value={correctIdx}
                      onChange={e => setCorrectIdx(Number(e.target.value))}
                      disabled={busy}
                    >
                      {options.map((c, idx) => (
                        <option key={c} value={idx}>
                          {idx + 1}
                          {' '}
                          -
                          {' '}
                          {c.slice(0, 30)}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              : (
                  <div className="text-xs text-text-muted">
                    mcq_multi: UI quick hiện chưa set multi-correct (sẽ làm ở bước CRUD đầy đủ).
                  </div>
                )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !qPrompt.trim()}
              onClick={addQuestion}
            >
              {busy ? 'Đang lưu...' : 'Thêm câu'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-lg font-semibold">Share pool (owner)</div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm">
              <div className="font-medium text-text-heading">Email giảng viên</div>
              <input
                className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <div className="font-medium text-text-heading">Permission</div>
              <select
                className="rounded-md border border-border-subtle bg-bg-section px-2 py-2 text-text-body"
                value={sharePerm}
                onChange={e => setSharePerm(e.target.value as 'view' | 'use' | 'edit')}
                disabled={busy}
              >
                <option value="view">view</option>
                <option value="use">use</option>
                <option value="edit">edit</option>
              </select>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || !shareEmail.trim()}
              onClick={sharePool}
            >
              Share
            </Button>
          </div>

          <div className="mt-5">
            <div className="text-sm font-medium text-text-heading">Danh sách share</div>
            <div className="mt-2 grid gap-2">
              {shares.length === 0
                ? (
                    <div className="text-sm text-text-muted">Chưa share cho ai.</div>
                  )
                : (
                    shares.map(s => (
                      <div key={s.sharedWithTeacher.id} className="rounded-md border border-border-subtle bg-bg-section px-3 py-2 text-sm">
                        <div className="font-medium">
                          {s.sharedWithTeacher.email ?? '(no email)'}
                        </div>
                        <div className="text-text-muted">
                          perm:
                          {' '}
                          <span className="font-mono">{s.permission}</span>
                        </div>
                      </div>
                    ))
                  )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-lg font-semibold text-text-heading">
          Câu hỏi (
          {questions.length}
          )
        </div>
        <div className="mt-3 grid gap-3">
          {questions.length === 0
            ? (
                <div className="text-sm text-text-muted">Chưa có câu hỏi.</div>
              )
            : (
                questions.map(q => (
                  <div key={q.id} className="rounded-md border border-border-subtle bg-bg-section p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        <span className="font-mono">{q.type}</span>
                        {' '}
                        ·
                        {' '}
                        <span className="font-mono">{q.id}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm whitespace-pre-wrap text-text-body">{q.prompt}</div>
                    <div className="mt-2 grid gap-1 text-sm">
                      {q.options.map(o => (
                        <div key={o.order} className="flex items-start gap-2">
                          <div className="w-6 shrink-0 font-mono text-text-muted">
                            {o.order + 1}
                            .
                          </div>
                          <div className={o.isCorrect ? 'font-medium text-success' : 'text-text-body'}>{o.content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.tags.map(t => (
                        <span
                          key={t.normalizedName}
                          className="rounded-full border border-border-subtle bg-bg-section px-2 py-0.5 text-xs text-text-body"
                          title={t.normalizedName}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
        </div>
      </Card>
    </div>
  );
}
