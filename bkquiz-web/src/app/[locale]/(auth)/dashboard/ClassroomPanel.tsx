'use client';

import { useEffect, useState } from 'react';

type Classroom = {
  id: string;
  name: string;
  classCode: string;
};

type QuizLite = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  ruleCount?: number;
};

export function ClassroomPanel(props: { initial: Classroom[] }) {
  const [classes, setClasses] = useState<Classroom[]>(props.initial);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [quizByClass, setQuizByClass] = useState<Record<string, QuizLite[]>>({});
  const [selectedQuizByClass, setSelectedQuizByClass] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createClass() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newClassName }),
      });
      if (!res.ok) {
        throw new Error('CREATE_FAILED');
      }
      const c = (await res.json()) as Classroom;
      setClasses(prev => [c, ...prev]);
      setNewClassName('');
    } catch {
      setError('Không tạo được lớp. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function joinClass() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classCode: joinCode }),
      });
      if (!res.ok) {
        throw new Error('JOIN_FAILED');
      }
      const c = (await res.json()) as Classroom;
      setClasses((prev) => {
        if (prev.some(x => x.id === c.id)) {
          return prev;
        }
        return [c, ...prev];
      });
      setJoinCode('');
    } catch {
      setError('Không join được lớp. Kiểm tra class code và thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function createSession(classroomId: string) {
    if (sessionTitle.trim().length === 0) {
      setError('Vui lòng nhập tên session trước khi tạo.');
      return;
    }
    const quizId = selectedQuizByClass[classroomId] || '';
    if (quizId) {
      const quizzes = quizByClass[classroomId] ?? [];
      const q = quizzes.find(x => x.id === quizId) ?? null;
      if (q && (q.ruleCount ?? 0) === 0) {
        setError('Quiz bạn chọn chưa có rule (tag/pool). Vào Dashboard → Quizzes để cấu hình rule trước.');
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          title: sessionTitle,
          quizId: quizId || undefined,
        }),
      });
      const data = await res.json() as { sessionId?: string; error?: string };
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error ?? 'CREATE_SESSION_FAILED');
      }
      setSessionTitle('');
      window.location.href = `/dashboard/sessions/${data.sessionId}/teacher`;
    } catch {
      setError('Không tạo được session. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function loadQuizzesForClassroom(classroomId: string) {
    const res = await fetch(`/api/quizzes?classroomId=${encodeURIComponent(classroomId)}`, { method: 'GET' });
    const json = await res.json() as { quizzes?: QuizLite[] };
    if (!res.ok) {
      return;
    }
    setQuizByClass(prev => ({ ...prev, [classroomId]: json.quizzes ?? [] }));
  }

  // Auto-load quizzes for visible classrooms (best-effort).
  useEffect(() => {
    void Promise.all(classes.map(c => loadQuizzesForClassroom(c.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-lg font-semibold">Tạo lớp (Teacher)</div>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Tên lớp (VD: DSA K66)"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
              onClick={createClass}
              disabled={busy || newClassName.trim().length === 0}
            >
              Tạo
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-lg font-semibold">Join lớp (Student)</div>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-md border px-3 py-2 uppercase"
              placeholder="Nhập class code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
              onClick={joinClass}
              disabled={busy || joinCode.trim().length === 0}
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {error
        ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )
        : null}

      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Các lớp của bạn</div>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="text-sm text-gray-700 md:w-40">Tên session</div>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="VD: Quiz tuần 1"
            value={sessionTitle}
            onChange={e => setSessionTitle(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="mt-3 grid gap-2">
          {classes.length === 0
            ? (
                <div className="text-sm text-gray-600">Chưa có lớp nào.</div>
              )
            : classes.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-sm text-gray-600">
                      Code:
                      {' '}
                      <span className="font-mono">{c.classCode}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        className="rounded-md border px-2 py-1 text-xs"
                        value={selectedQuizByClass[c.id] ?? ''}
                        onChange={(e) => {
                          setSelectedQuizByClass(prev => ({ ...prev, [c.id]: e.target.value }));
                        }}
                        disabled={busy || !(quizByClass[c.id]?.length)}
                      >
                        <option value="">(Không chọn quiz)</option>
                        {(quizByClass[c.id] ?? []).map(q => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                            {' '}
                            [
                            {q.status}
                            , rules=
                            {q.ruleCount ?? 0}
                            ]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={busy || sessionTitle.trim().length === 0}
                    onClick={() => void createSession(c.id)}
                  >
                    Tạo session
                  </button>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
