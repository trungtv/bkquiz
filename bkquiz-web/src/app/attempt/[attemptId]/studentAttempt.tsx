'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { idbGet, idbSet } from '@/utils/idb';

type AttemptState = {
  id: string;
  status: 'active' | 'submitted' | 'locked';
  session: { id: string; status: 'lobby' | 'active' | 'ended'; quiz: { title: string } };
  nextDueAt: string | null;
  due: boolean;
  warning: boolean;
  graceSecondsBeforeBlock: number;
  failedCount: number;
  cooldownUntil: string | null;
  lockedUntil: string | null;
  inCooldown: boolean;
  isLocked: boolean;
};

type SnapshotQuestion = {
  id: string;
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  order: number;
  options: Array<{ order: number; content: string }>;
};

type LocalAnswer = { selected: number[]; updatedAt: number; dirty: boolean };
type LocalAnswerStore = Record<string, LocalAnswer>;

const IDB_OPTS = { dbName: 'bkquiz', storeName: 'attemptAnswers' } as const;

function storageKey(attemptId: string) {
  return `bkquiz:attempt:${attemptId}:answers:v1`;
}

async function readLocalAnswers(attemptId: string): Promise<LocalAnswerStore> {
  const key = storageKey(attemptId);
  try {
    const v = await idbGet<LocalAnswerStore>(IDB_OPTS, key);
    if (v) {
      return v;
    }
  } catch {
    // fallback to localStorage below
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as LocalAnswerStore;
  } catch {
    return {};
  }
}

async function writeLocalAnswers(attemptId: string, store: LocalAnswerStore) {
  const key = storageKey(attemptId);
  try {
    await idbSet(IDB_OPTS, key, store);
    return;
  } catch {
    // fallback to localStorage below
  }
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function AttemptClient(props: { attemptId: string }) {
  const [state, setState] = useState<AttemptState | null>(null);
  const [questions, setQuestions] = useState<SnapshotQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const localAnswersRef = useRef<LocalAnswerStore>({});
  const syncTimerRef = useRef<number | null>(null);

  function computePending(store: LocalAnswerStore) {
    return Object.values(store).filter(a => a.dirty).length;
  }

  async function syncDirtyAnswers() {
    if (!navigator.onLine) {
      return;
    }
    setSyncError(null);
    const store = localAnswersRef.current;
    const dirtyEntries = Object.entries(store).filter(([, a]) => a.dirty);
    if (dirtyEntries.length === 0) {
      return;
    }

    // Best-effort sequential sync to keep it simple and avoid hammering.
    for (const [sessionQuestionId, a] of dirtyEntries) {
      const ok = await fetch(`/api/attempts/${props.attemptId}/answers`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionQuestionId, selected: a.selected }),
      }).then(r => r.ok).catch(() => false);
      if (ok) {
        store[sessionQuestionId] = { ...a, dirty: false };
        await writeLocalAnswers(props.attemptId, store);
      } else {
        setSyncError('SYNC_FAILED');
      }
    }
    localAnswersRef.current = { ...store };
    setPendingCount(computePending(localAnswersRef.current));
    setLastSyncAt(Date.now());
  }

  function scheduleSync() {
    if (!navigator.onLine) {
      return;
    }
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      void syncDirtyAnswers();
    }, 500);
  }

  useEffect(() => {
    const current = questions[idx];
    if (!current) {
      return;
    }
    if (!state || state.status !== 'active') {
      return;
    }

    // Save locally immediately; sync best-effort when online.
    const store = localAnswersRef.current;
    store[current.id] = { selected, updatedAt: Date.now(), dirty: true };
    localAnswersRef.current = { ...store };
    void writeLocalAnswers(props.attemptId, localAnswersRef.current);
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setPendingCount(computePending(localAnswersRef.current));
    scheduleSync();

    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, idx, questions.length, state?.status]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${props.attemptId}/submit`, { method: 'POST' });
      const json = await res.json() as { ok?: boolean; error?: string; correctCount?: number; totalQuestions?: number; score?: number };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'SUBMIT_FAILED');
        return;
      }
      setError(`Đã submit. Score: ${json.score} (đúng ${json.correctCount}/${json.totalQuestions})`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    const res = await fetch(`/api/attempts/${props.attemptId}/state`, { method: 'GET' });
    const json = await res.json() as AttemptState & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'ATTEMPT_NOT_FOUND');
      return;
    }
    setError(null);
    setState(json);
  }

  async function loadQuestions() {
    const res = await fetch(`/api/attempts/${props.attemptId}/questions`, { method: 'GET' });
    const json = await res.json() as { questions?: SnapshotQuestion[]; error?: string };
    if (!res.ok) {
      return;
    }
    setQuestions(json.questions ?? []);
  }

  async function loadAnswers() {
    // Start with local cache
    localAnswersRef.current = await readLocalAnswers(props.attemptId);
    setPendingCount(computePending(localAnswersRef.current));
    const current = questions[idx];
    if (current) {
      setSelected(localAnswersRef.current[current.id]?.selected ?? []);
    }

    // Then merge from server (if online)
    if (!navigator.onLine) {
      return;
    }
    const res = await fetch(`/api/attempts/${props.attemptId}/answers`, { method: 'GET' });
    const json = await res.json() as { answers?: Array<{ sessionQuestionId: string; selected: number[]; updatedAt?: string | Date }>; error?: string };
    if (!res.ok) {
      return;
    }
    const store = { ...localAnswersRef.current };
    for (const a of (json.answers ?? [])) {
      const serverUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const local = store[a.sessionQuestionId];
      if (!local || (!local.dirty && serverUpdatedAt >= local.updatedAt)) {
        store[a.sessionQuestionId] = { selected: a.selected, updatedAt: Math.max(serverUpdatedAt, local?.updatedAt ?? 0), dirty: false };
      }
    }
    localAnswersRef.current = store;
    await writeLocalAnswers(props.attemptId, store);
    setPendingCount(computePending(store));
    if (current) {
      setSelected(store[current.id]?.selected ?? []);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setIsOnline(navigator.onLine);
    void (async () => {
      localAnswersRef.current = await readLocalAnswers(props.attemptId);
      setPendingCount(computePending(localAnswersRef.current));
    })();

    const onOnline = () => {
      setIsOnline(true);
      void load();
      void loadQuestions();
      void loadAnswers();
      void syncDirtyAnswers();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    void load().catch(() => setIsOnline(false));
    void loadQuestions().catch(() => setIsOnline(false));
    void loadAnswers().catch(() => setIsOnline(false));
    const id = window.setInterval(() => {
      if (!navigator.onLine) {
        return;
      }
      void load().catch(() => setIsOnline(false));
    }, 1500);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.attemptId]);

  useEffect(() => {
    const current = questions[idx];
    if (!current) {
      return;
    }
    // Prefer local cache when switching questions
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setSelected(localAnswersRef.current[current.id]?.selected ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions.length]);

  const nextDueIn = useMemo(() => {
    if (!state?.nextDueAt) {
      return null;
    }
    const ms = new Date(state.nextDueAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state?.nextDueAt]);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${props.attemptId}/verifyToken`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json() as { error?: string; ok?: boolean };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'WRONG_TOKEN');
        return;
      }
      setToken('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-lg font-semibold">Có lỗi</div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-lg font-semibold">Đang tải...</div>
      </div>
    );
  }

  const blocked = state.isLocked || (state.due && state.session.status === 'active') || (!isOnline && state.session.status === 'active' && state.nextDueAt !== null);
  const q = questions[idx] ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">{state.session.quiz.title}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className={isOnline ? 'rounded bg-emerald-50 px-2 py-1 text-emerald-700' : 'rounded bg-zinc-100 px-2 py-1 text-zinc-700'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
              Pending:
              {' '}
              <span className="font-mono">{pendingCount}</span>
            </span>
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
              disabled={!isOnline || pendingCount === 0 || busy}
              onClick={() => void syncDirtyAnswers()}
            >
              Sync now
            </button>
          </div>
        </div>
        {syncError
          ? (
              <div className="mt-2 text-xs text-red-700">
                Sync lỗi (sẽ tự thử lại khi online):
                {' '}
                <span className="font-mono">{syncError}</span>
              </div>
            )
          : null}
        {lastSyncAt
          ? (
              <div className="mt-1 text-xs text-gray-500">
                Last sync:
                {' '}
                <span className="font-mono">{new Date(lastSyncAt).toLocaleTimeString()}</span>
              </div>
            )
          : null}
        <div className="mt-1 text-sm text-gray-600">
          Attempt:
          {' '}
          <span className="font-mono">{state.id}</span>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          Next checkpoint:
          {' '}
          <span className="font-mono">{nextDueIn === null ? '...' : `${nextDueIn}s`}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-700">
          {q
            ? (
                <div>
                  <div className="mb-3 text-sm text-gray-600">
                    Câu
                    {' '}
                    {idx + 1}
                    /
                    {questions.length}
                  </div>
                  <div className="whitespace-pre-wrap text-gray-900">{q.prompt}</div>
                  <div className="mt-4 grid gap-2">
                    {q.options.map(o => (
                      <label key={o.order} className="flex items-start gap-2 rounded-md border p-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(o.order)}
                          onChange={(e) => {
                            if (q.type === 'mcq_single') {
                              setSelected(e.target.checked ? [o.order] : []);
                              return;
                            }
                            setSelected((prev) => {
                              if (e.target.checked) {
                                return [...prev, o.order];
                              }
                              return prev.filter(x => x !== o.order);
                            });
                          }}
                        />
                        <div className="text-sm text-gray-800">{o.content}</div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Autosave bật: lưu local ngay lập tức, sync khi online.
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => setIdx(i => Math.max(0, i - 1))}
                      disabled={idx === 0}
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
                      disabled={idx >= questions.length - 1}
                    >
                      Sau
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    (MVP) Chưa autosave/submit, mình sẽ nối API answers + submit ở bước kế tiếp.
                  </div>
                </div>
              )
            : (
                <div className="text-sm text-gray-700">
                  Chưa có câu hỏi trong session (cần cấu hình quiz rules + Start session để snapshot).
                </div>
              )}
        </div>
        {state.warning && !blocked
          ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Sắp đến hạn verify token (grace
                {' '}
                {state.graceSecondsBeforeBlock}
                s)…
              </div>
            )
          : null}
      </div>

      <div className="rounded-lg border bg-white p-6">
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy || blocked || state.status !== 'active' || !isOnline || pendingCount > 0}
          onClick={() => void submit()}
        >
          Submit
        </button>
        <div className="mt-2 text-xs text-gray-500">
          Chỉ submit được khi online, không pending sync, và không bị checkpoint block.
        </div>
      </div>

      {blocked
        ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <div className="text-lg font-semibold text-red-800">Checkpoint: nhập token để tiếp tục</div>
              <div className="mt-2 text-sm text-red-700">
                {!isOnline
                  ? 'Bạn đang offline. Vui lòng online lại để verify token.'
                  : (state.isLocked ? 'Bạn đang bị lock do nhập sai nhiều lần.' : 'Đến hạn verify token.')}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <div className="text-sm font-medium text-red-900">Token</div>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    disabled={busy || state.inCooldown || state.isLocked || !isOnline}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={() => void verify()}
                  disabled={busy || token.trim().length === 0 || state.inCooldown || state.isLocked || !isOnline}
                >
                  {busy ? 'Đang verify...' : 'Verify'}
                </button>
              </div>

              <div className="mt-3 text-sm text-red-700">
                Sai:
                {' '}
                <span className="font-mono">{state.failedCount}</span>
                {state.inCooldown ? ' · đang cooldown 30s' : null}
              </div>
            </div>
          )
        : null}
    </div>
  );
}
// EOF
