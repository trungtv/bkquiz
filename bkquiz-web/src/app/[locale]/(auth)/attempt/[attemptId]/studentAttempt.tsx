'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MathRenderer } from '@/components/MathRenderer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
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

type LocalAnswer = { selected: number[]; updatedAt: number; dirty: boolean; submittedAt?: number | null };
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(() => new Set());
  const localAnswersRef = useRef<LocalAnswerStore>({});
  const syncTimerRef = useRef<number | null>(null);
  const prevIdxRef = useRef<number>(0);
  const prevSelectedRef = useRef<number[]>([]);

  function computePending(store: LocalAnswerStore) {
    return Object.values(store).filter(a => a.dirty).length;
  }

  function computeAnsweredCount(store: LocalAnswerStore) {
    return questions.filter((q) => {
      const answer = store[q.id];
      return answer && answer.selected.length > 0;
    }).length;
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

  // Save selected answers when selected changes (but not when idx changes)
  useEffect(() => {
    const current = questions[idx];
    if (!current) {
      return;
    }
    if (!state || state.status !== 'active') {
      return;
    }

    // Don't save if we just switched questions (idx changed)
    const idxChanged = prevIdxRef.current !== idx;
    if (idxChanged) {
      prevIdxRef.current = idx;
      prevSelectedRef.current = [...selected];
      return;
    }

    // Only save if selected actually changed (user made a selection)
    // Don't overwrite if already submitted (preserve submittedAt)
    const selectedChanged = JSON.stringify(prevSelectedRef.current) !== JSON.stringify(selected);
    if (selectedChanged) {
      const existing = localAnswersRef.current[current.id];
      const isSubmitted = existing?.submittedAt != null;
    // Save locally immediately; sync best-effort when online.
    const store = localAnswersRef.current;
      store[current.id] = {
        selected,
        updatedAt: Date.now(),
        dirty: !isSubmitted, // Don't mark as dirty if already submitted (to avoid overwriting)
        submittedAt: existing?.submittedAt ?? null,
      };
    localAnswersRef.current = { ...store };
    void writeLocalAnswers(props.attemptId, localAnswersRef.current);
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setPendingCount(computePending(localAnswersRef.current));
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setAnsweredCount(computeAnsweredCount(localAnswersRef.current));
      if (!isSubmitted) {
    scheduleSync();
      }
      prevSelectedRef.current = [...selected];
    }

    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, idx, state?.status]);

  // Update prevIdxRef when idx changes (separate effect to track idx changes)
  useEffect(() => {
    prevIdxRef.current = idx;
    const current = questions[idx];
    if (current) {
      const cachedAnswer = localAnswersRef.current[current.id];
      prevSelectedRef.current = cachedAnswer?.selected ?? [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Update answeredCount when questions or localAnswersRef changes
  useEffect(() => {
    if (questions.length > 0) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setAnsweredCount(computeAnsweredCount(localAnswersRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  async function submitQuestion(questionId: string) {
    if (!state || state.status !== 'active' || !isOnline) {
      return;
    }
    const current = questions.find(q => q.id === questionId);
    if (!current) {
      return;
    }
    const currentSelected = localAnswersRef.current[current.id]?.selected ?? selected;
    setBusy(true);
    try {
      const res = await fetch(`/api/attempts/${props.attemptId}/answers`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionQuestionId: current.id,
          selected: currentSelected,
          submit: true,
        }),
      });
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        setError('SUBMIT_QUESTION_FAILED');
        return;
      }
      let json: { ok?: boolean; error?: string };
      try {
        json = JSON.parse(text);
      } catch {
        setError('SUBMIT_QUESTION_FAILED');
        return;
      }
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'SUBMIT_QUESTION_FAILED');
        return;
      }
      // Update local state
      const store = localAnswersRef.current;
      store[current.id] = {
        selected: currentSelected,
        updatedAt: Date.now(),
        dirty: false,
        submittedAt: Date.now(),
      };
      localAnswersRef.current = { ...store };
      await writeLocalAnswers(props.attemptId, store);
      setSubmittedQuestions(new Set([...submittedQuestions, current.id]));
      setPendingCount(computePending(store));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setShowSubmitConfirm(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${props.attemptId}/submit`, { method: 'POST' });
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        setError('SUBMIT_FAILED');
        return;
      }
      let json: { ok?: boolean; error?: string; correctCount?: number; totalQuestions?: number; score?: number };
      try {
        json = JSON.parse(text);
      } catch {
        setError('SUBMIT_FAILED');
        return;
      }
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
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      setError('ATTEMPT_NOT_FOUND');
      return;
    }
    let json: AttemptState & { error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      setError('ATTEMPT_NOT_FOUND');
      return;
    }
    if (!res.ok) {
      setError(json.error ?? 'ATTEMPT_NOT_FOUND');
      return;
    }
    setError(null);
    setState(json);
  }

  async function loadQuestions() {
    const res = await fetch(`/api/attempts/${props.attemptId}/questions`, { method: 'GET' });
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return;
    }
    let json: { questions?: SnapshotQuestion[]; error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
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
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return;
    }
    let json: { answers?: Array<{ sessionQuestionId: string; selected: number[]; submittedAt?: string | Date | null; updatedAt?: string | Date }>; error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
    if (!res.ok) {
      return;
    }
    const store = { ...localAnswersRef.current };
    const submittedSet = new Set<string>();
    for (const a of (json.answers ?? [])) {
      const serverUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const local = store[a.sessionQuestionId];
      const submittedAt = a.submittedAt ? new Date(a.submittedAt).getTime() : null;
      if (submittedAt) {
        submittedSet.add(a.sessionQuestionId);
      }
      if (!local || (!local.dirty && serverUpdatedAt >= local.updatedAt)) {
        store[a.sessionQuestionId] = {
          selected: a.selected,
          updatedAt: Math.max(serverUpdatedAt, local?.updatedAt ?? 0),
          dirty: false,
          submittedAt: submittedAt ?? local?.submittedAt ?? null,
        };
      }
    }
    setSubmittedQuestions(submittedSet);
    localAnswersRef.current = store;
    await writeLocalAnswers(props.attemptId, store);
    setPendingCount(computePending(store));
    setAnsweredCount(computeAnsweredCount(store));
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
    // Load selected from cache when switching questions
    // Reset selected first to avoid stale state
    const cachedAnswer = localAnswersRef.current[current.id];
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setSelected(cachedAnswer?.selected ?? []);
    // Update submittedQuestions set based on cache
    if (cachedAnswer?.submittedAt != null) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setSubmittedQuestions((prev) => {
        if (prev.has(current.id)) {
          return prev;
        }
        return new Set([...prev, current.id]);
      });
    }
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
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        setError('WRONG_TOKEN');
        return;
      }
      let json: { error?: string; ok?: boolean };
      try {
        json = JSON.parse(text);
      } catch {
        setError('WRONG_TOKEN');
        return;
      }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Sticky Status Bar - Neo lên top đầu */}
      <div className="sticky top-0 z-50 -mx-4 border-b border-border-subtle bg-bg-page/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-2.5">
        {/* Row 1: Quiz title (compact) */}
        <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-text-heading sm:text-base">{state.session.quiz.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted sm:text-xs">
                <span>
                  Câu
                  {' '}
                  <span className="font-mono font-semibold">{questions.length === 0 ? '-' : (idx + 1)}</span>
                  /
                  <span className="font-mono">{questions.length || '-'}</span>
            </span>
            <span>·</span>
            <span>
              Đã trả lời:
              {' '}
              <span className="font-mono font-semibold text-text-heading">{answeredCount}</span>
              /
              <span className="font-mono">{questions.length || '-'}</span>
            </span>
              {nextDueIn !== null && (
                  <>
                    <span>·</span>
                    <span>
                      <span className={cn(
                        'font-mono font-semibold',
                        nextDueIn <= 10 ? 'text-danger' : nextDueIn <= 30 ? 'text-warning' : 'text-text-heading',
                      )}
                      >
                      {nextDueIn}
                      </span>
                    s
                    </span>
                  </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={isOnline ? 'success' : 'danger'} className="text-[9px] sm:text-[10px]">{isOnline ? 'Online' : 'Offline'}</Badge>
            {pendingCount > 0 && (
              <Badge variant="warning" className="text-[9px] sm:text-[10px]">
                    <span className="font-mono">{pendingCount}</span>
                  </Badge>
            )}
            {state.warning && !blocked && <Badge variant="warning" className="text-[9px] sm:text-[10px]">⚠️</Badge>}
            {blocked && <Badge variant="danger" className="text-[9px] sm:text-[10px]">🔒</Badge>}
          </div>
        </div>

        {/* Row 2: Progress bar (compact) */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-section sm:h-2">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold text-text-heading sm:text-xs">
            {progressPct}
            %
          </span>
        </div>

        {/* Error/Sync status (compact, chỉ hiện khi có) */}
        {syncError && (
          <div className="mt-1 text-[9px] text-danger sm:text-[10px]">
            Sync lỗi:
                {' '}
                <span className="font-mono">{syncError}</span>
              </div>
        )}
      </div>

      {/* Question Navigation Grid */}
      {questions.length > 0
        ? (
            <Card className="p-3 sm:p-4">
              <div className="mb-2 text-xs font-semibold text-text-heading sm:mb-3 sm:text-sm">Danh sách câu hỏi</div>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 sm:gap-2 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20">
                {questions.map((question, i) => {
                  const status = getQuestionStatus(question.id, i);
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={cn(
                        'aspect-square rounded-md border-2 p-1 text-[10px] font-mono transition-all duration-fast sm:p-2 sm:text-xs',
                        'active:scale-95 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 sm:focus:ring-offset-2',
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
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-text-muted sm:mt-3 sm:gap-4 sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3 w-3 rounded border-2 border-primary bg-primary/20 sm:h-4 sm:w-4" />
                  <span>Đang xem</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3 w-3 rounded border-2 border-success/50 bg-success/10 sm:h-4 sm:w-4" />
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3 w-3 rounded border-2 border-border-subtle bg-bg-section sm:h-4 sm:w-4" />
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </Card>
          )
        : null}

      <Card className="p-4 sm:p-6">
        <div className="text-sm text-text-body">
          {q
            ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
                    <div className="text-xs text-text-muted sm:text-sm">
                      Câu
                      {' '}
                      <span className="font-mono">{idx + 1}</span>
                      /
                      <span className="font-mono">{questions.length}</span>
                    </div>
                    <Badge variant="info" className="text-[10px] sm:text-xs">{q.type === 'mcq_single' ? 'Chọn 1' : 'Chọn nhiều'}</Badge>
                  </div>
                  <div className="text-sm text-text-heading sm:text-base">
                    <MathRenderer content={q.prompt} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:mt-4">
                    {q.options.map((o) => {
                      const optionLabel = String.fromCharCode(65 + o.order); // A, B, C, D...
                      const isSelected = selected.includes(o.order);
                      return (
                        <label
                          key={o.order}
                          aria-label={`option:${o.order}`}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border-2 p-2.5 transition-all duration-fast ease-soft sm:gap-3 sm:p-3',
                            'bg-bg-section active:scale-[0.98] hover:bg-bg-elevated hover:scale-[1.01]',
                            isSelected ? 'border-primary bg-primary/10 shadow-md' : 'border-border-subtle',
                          )}
                        >
                          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                              className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
                            />
                            <div className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-xs sm:h-8 sm:w-8 sm:text-sm',
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-border-subtle bg-bg-card text-text-muted',
                            )}
                            >
                              {optionLabel}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-text-body sm:text-base">
                              <MathRenderer content={o.content} />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        {submittedQuestions.has(q.id)
                          ? (
                              <Badge variant="success" className="text-[10px] sm:text-xs">
                                ✓ Đã submit
                              </Badge>
                            )
                          : (
                              <Badge variant="neutral" className="text-[10px] sm:text-xs">
                                Chưa submit
                              </Badge>
                            )}
                        <div className="text-[10px] text-text-muted sm:text-xs">
                      Autosave bật: lưu local ngay lập tức, sync khi online.
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                          className="flex-1 sm:flex-initial"
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
                        disabled={idx >= questions.length - 1}
                          className="flex-1 sm:flex-initial"
                      >
                        Sau
                      </Button>
                    </div>
                    </div>
                    {!submittedQuestions.has(q.id) && (
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => void submitQuestion(q.id)}
                          disabled={busy || !isOnline || state?.status !== 'active' || selected.length === 0}
                          className="w-full sm:w-auto"
                        >
                          Submit câu này
                        </Button>
                      </div>
                    )}
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

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="primary"
            disabled={busy || blocked || state.status !== 'active' || !isOnline || pendingCount > 0}
            onClick={() => setShowSubmitConfirm(true)}
            className="w-full sm:w-auto"
          >
            Submit
          </Button>
          <div className="text-[10px] text-text-muted sm:text-xs">
            Chỉ submit khi online, không pending sync, và không bị checkpoint block.
          </div>
        </div>
      </Card>

      {/* Checkpoint Modal */}
      {blocked
        ? (
            <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6">
              <Card className="w-full max-w-md p-4 sm:p-6">
                <div className="mb-3 text-center sm:mb-4">
                  <div className={cn(
                    'mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-mono font-bold sm:mb-4 sm:h-20 sm:w-20 sm:text-4xl',
                    nextDueIn !== null && nextDueIn <= 10 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning',
                  )}
                  >
                    {nextDueIn !== null ? nextDueIn : '...'}
                  </div>
                  <div className="text-lg font-semibold text-text-heading sm:text-xl">Checkpoint: Nhập token để tiếp tục</div>
                  <div className="mt-2 text-xs text-text-muted sm:text-sm">
                    {!isOnline
                      ? 'Bạn đang offline. Vui lòng online lại để verify token.'
                      : (state.isLocked ? 'Bạn đang bị lock do nhập sai nhiều lần.' : 'Đến hạn verify token.')}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <label htmlFor="checkpointToken">
                    <div className="mb-1 text-xs font-medium text-text-heading sm:text-sm">Token</div>
                    <Input
                      id="checkpointToken"
                      className="font-mono text-sm sm:text-base"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      disabled={busy || state.inCooldown || !isOnline}
                      placeholder="Nhập token từ màn hình giáo viên"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !busy && token.trim().length > 0 && !state.inCooldown && isOnline) {
                          void verify();
                        }
                      }}
                    />
                  </label>

                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => void verify()}
                    disabled={busy || token.trim().length === 0 || state.inCooldown || !isOnline}
                  >
                    {busy ? 'Đang verify...' : 'Verify'}
                  </Button>

                  <div className="text-center text-[10px] text-text-muted sm:text-xs">
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
            <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6">
              <Card className="w-full max-w-md p-4 sm:p-6">
                <div className="mb-3 text-base font-semibold text-text-heading sm:mb-4 sm:text-lg">Xác nhận nộp bài</div>
                <div className="mb-4 space-y-2 text-xs sm:mb-6 sm:text-sm">
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
                        <div className="mt-3 rounded-md bg-warning/10 p-2.5 text-[10px] text-warning sm:mt-4 sm:p-3 sm:text-xs">
                          Bạn còn
                          {' '}
                          {questions.length - answeredCount}
                          {' '}
                          câu chưa trả lời. Bạn có chắc muốn nộp bài?
                        </div>
                      )
                    : null}
                </div>
                <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="w-full sm:w-auto"
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="w-full sm:w-auto"
                  >
                    {busy ? 'Đang submit...' : 'Xác nhận nộp bài'}
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
