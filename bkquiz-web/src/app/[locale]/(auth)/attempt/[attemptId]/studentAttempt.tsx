'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MathRenderer } from '@/components/MathRenderer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { getI18nPath } from '@/utils/Helpers';
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
  const locale = useLocale();
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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
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
    setShowSubmitConfirm(false);
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
    setAnsweredCount(questions.filter((q) => {
      const answer = store[q.id];
      return answer && answer.selected.length > 0;
    }).length);
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
      <Card>
        <div className="text-lg font-semibold text-text-heading">Có lỗi</div>
        <div className="mt-2 text-sm text-danger">{error}</div>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card className="p-6">
        <div className="text-lg font-semibold">Đang tải...</div>
      </Card>
    );
  }

  const blocked = state.isLocked || (state.due && state.session.status === 'active') || (!isOnline && state.session.status === 'active' && state.nextDueAt !== null);
  const q = questions[idx] ?? null;
  const progressPct = questions.length > 0 ? Math.round(((idx + 1) / questions.length) * 100) : 0;

  const getQuestionStatus = (questionId: string, questionIdx: number) => {
    if (questionIdx === idx) {
      return 'current';
    }
    const answer = localAnswersRef.current[questionId];
    if (answer && answer.selected.length > 0) {
      return 'answered';
    }
    return 'unanswered';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <Link
          href={getI18nPath('/dashboard', locale)}
          className="hover:text-text-heading transition-colors"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={getI18nPath('/dashboard/classes', locale)}
          className="hover:text-text-heading transition-colors"
        >
          Lớp học
        </Link>
        <span>/</span>
        <span className="text-text-muted">Làm bài</span>
      </div>

      {/* Sticky topbar - Improved 2-row layout */}
      <div className="sticky top-[56px] z-sticky -mx-4 border-b border-border-subtle bg-bg-page/80 px-4 py-4 backdrop-blur">
        {/* Row 1: Quiz title + Progress bar */}
        <div className="mb-3">
          <div className="truncate text-lg font-semibold text-text-heading">{state.session.quiz.title}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                <span>
                  Câu
                  {' '}
                  <span className="font-mono font-semibold">{questions.length === 0 ? '-' : (idx + 1)}</span>
                  /
                  <span className="font-mono">{questions.length || '-'}</span>
                </span>
                <span className="font-mono font-semibold text-text-heading">
                  {progressPct}
                  %
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-bg-section">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Metadata + Status badges */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="font-mono">
              Attempt
              {state.id.slice(0, 8)}
            </span>
            <span>·</span>
            <span>
              Đã trả lời:
              {' '}
              <span className="font-mono font-semibold text-text-heading">{answeredCount}</span>
              /
              <span className="font-mono">{questions.length || '-'}</span>
            </span>
            {nextDueIn !== null
              ? (
                  <>
                    <span>·</span>
                    <span>
                      Checkpoint:
                      {' '}
                      <span className={cn(
                        'font-mono font-semibold',
                        nextDueIn <= 10 ? 'text-danger' : nextDueIn <= 30 ? 'text-warning' : 'text-text-heading',
                      )}
                      >
                        {nextDueIn}s
                      </span>
                    </span>
                  </>
                )
              : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isOnline ? 'success' : 'danger'}>{isOnline ? 'Online' : 'Offline'}</Badge>
            {pendingCount > 0
              ? (
                  <Badge variant="warning">
                    Pending
                    {' '}
                    <span className="font-mono">{pendingCount}</span>
                  </Badge>
                )
              : null}
            <Button
              size="sm"
              variant="ghost"
              disabled={!isOnline || pendingCount === 0 || busy}
              onClick={() => void syncDirtyAnswers()}
            >
              Sync now
            </Button>
            {state.warning && !blocked ? <Badge variant="warning">Sắp tới hạn</Badge> : null}
            {blocked ? <Badge variant="danger">Bị block</Badge> : null}
          </div>
        </div>

        {syncError
          ? (
              <div className="mt-2 text-xs text-danger">
                Sync lỗi (sẽ tự thử lại khi online):
                {' '}
                <span className="font-mono">{syncError}</span>
              </div>
            )
          : null}
        {lastSyncAt
          ? (
              <div className="mt-1 text-xs text-text-muted">
                Last sync:
                {' '}
                <span className="font-mono">{new Date(lastSyncAt).toLocaleTimeString()}</span>
              </div>
            )
          : null}
      </div>

      {/* Question Navigation Grid */}
      {questions.length > 0
        ? (
            <Card className="p-4">
              <div className="mb-3 text-sm font-semibold text-text-heading">Danh sách câu hỏi</div>
              <div className="grid grid-cols-10 gap-2 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-20">
                {questions.map((question, i) => {
                  const status = getQuestionStatus(question.id, i);
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={cn(
                        'aspect-square rounded-md border-2 p-2 text-xs font-mono transition-all duration-fast',
                        'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                        status === 'current' && 'border-primary bg-primary/20 shadow-md',
                        status === 'answered' && 'border-success/50 bg-success/10',
                        status === 'unanswered' && 'border-border-subtle bg-bg-section hover:bg-bg-elevated',
                      )}
                      aria-label={`Câu ${i + 1}: ${status === 'answered' ? 'Đã trả lời' : status === 'current' ? 'Đang xem' : 'Chưa trả lời'}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-primary bg-primary/20" />
                  <span>Đang xem</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-success/50 bg-success/10" />
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-border-subtle bg-bg-section" />
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </Card>
          )
        : null}

      <Card className="p-6">
        <div className="text-sm text-text-body">
          {q
            ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-text-muted">
                      Câu
                      {' '}
                      <span className="font-mono">{idx + 1}</span>
                      /
                      <span className="font-mono">{questions.length}</span>
                    </div>
                    <Badge variant="info">{q.type === 'mcq_single' ? 'Chọn 1' : 'Chọn nhiều'}</Badge>
                  </div>
                  <div className="text-base text-text-heading">
                    <MathRenderer content={q.prompt} />
                  </div>
                  <div className="mt-4 grid gap-2">
                    {q.options.map((o) => {
                      const optionLabel = String.fromCharCode(65 + o.order); // A, B, C, D...
                      const isSelected = selected.includes(o.order);
                      return (
                        <label
                          key={o.order}
                          aria-label={`option:${o.order}`}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 transition-all duration-fast ease-soft',
                            'bg-bg-section hover:bg-bg-elevated hover:scale-[1.01]',
                            isSelected ? 'border-primary bg-primary/10 shadow-md' : 'border-border-subtle',
                          )}
                        >
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
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
                              className="h-4 w-4"
                            />
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-sm',
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-border-subtle bg-bg-card text-text-muted',
                            )}
                            >
                              {optionLabel}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-base text-text-body">
                              <MathRenderer content={o.content} />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-text-muted">
                      Autosave bật: lưu local ngay lập tức, sync khi online.
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
                        disabled={idx >= questions.length - 1}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                </div>
              )
            : (
                <div className="text-sm text-text-body">
                  Chưa có câu hỏi trong session (cần cấu hình quiz rules + Start session để snapshot).
                </div>
              )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="primary"
            disabled={busy || blocked || state.status !== 'active' || !isOnline || pendingCount > 0}
            onClick={() => setShowSubmitConfirm(true)}
          >
            Submit
          </Button>
          <div className="text-xs text-text-muted">
            Chỉ submit khi online, không pending sync, và không bị checkpoint block.
          </div>
        </div>
      </Card>

      {/* Checkpoint Modal */}
      {blocked
        ? (
            <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <Card className="w-full max-w-md p-6">
                <div className="mb-4 text-center">
                  <div className={cn(
                    'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl font-mono font-bold',
                    nextDueIn !== null && nextDueIn <= 10 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning',
                  )}
                  >
                    {nextDueIn !== null ? nextDueIn : '...'}
                  </div>
                  <div className="text-xl font-semibold text-text-heading">Checkpoint: Nhập token để tiếp tục</div>
                  <div className="mt-2 text-sm text-text-muted">
                    {!isOnline
                      ? 'Bạn đang offline. Vui lòng online lại để verify token.'
                      : (state.isLocked ? 'Bạn đang bị lock do nhập sai nhiều lần.' : 'Đến hạn verify token.')}
                  </div>
                </div>

                <div className="space-y-4">
                  <label htmlFor="checkpointToken">
                    <div className="mb-1 text-sm font-medium text-text-heading">Token</div>
                    <Input
                      id="checkpointToken"
                      className="font-mono"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      disabled={busy || state.inCooldown || state.isLocked || !isOnline}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !busy && token.trim().length > 0 && !state.inCooldown && !state.isLocked && isOnline) {
                          void verify();
                        }
                      }}
                    />
                  </label>

                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => void verify()}
                    disabled={busy || token.trim().length === 0 || state.inCooldown || state.isLocked || !isOnline}
                  >
                    {busy ? 'Đang verify...' : 'Verify'}
                  </Button>

                  <div className="text-center text-xs text-text-muted">
                    Sai:
                    {' '}
                    <span className="font-mono">{state.failedCount}</span>
                    {state.inCooldown ? ' · đang cooldown 30s' : null}
                  </div>
                </div>
              </Card>
            </div>
          )
        : null}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm
        ? (
            <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <Card className="w-full max-w-md p-6">
                <div className="mb-4 text-lg font-semibold text-text-heading">Xác nhận nộp bài</div>
                <div className="mb-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Tổng số câu:</span>
                    <span className="font-semibold text-text-heading">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Đã trả lời:</span>
                    <span className="font-semibold text-success">{answeredCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Chưa trả lời:</span>
                    <span className={cn(
                      'font-semibold',
                      questions.length - answeredCount > 0 ? 'text-warning' : 'text-text-heading',
                    )}
                    >
                      {questions.length - answeredCount}
                    </span>
                  </div>
                  {questions.length - answeredCount > 0
                    ? (
                        <div className="mt-3 rounded-md bg-warning/10 p-2 text-xs text-warning">
                          ⚠️ Bạn còn
                          {' '}
                          {questions.length - answeredCount}
                          {' '}
                          câu chưa trả lời. Bạn có chắc muốn nộp bài?
                        </div>
                      )
                    : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => void submit()}
                    disabled={busy || blocked || state.status !== 'active' || !isOnline || pendingCount > 0}
                  >
                    {busy ? 'Đang nộp...' : 'Xác nhận nộp'}
                  </Button>
                </div>
              </Card>
            </div>
          )
        : null}
    </div>
  );
}
// EOF
