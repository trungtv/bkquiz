'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

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

export function ClassroomPanel(props: { initial: Classroom[]; role: 'teacher' | 'student' }) {
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
    <div className="space-y-7">
      <div className="grid gap-5 md:grid-cols-2">
        {props.role === 'teacher'
          ? (
              <Card className="p-5 md:p-6">
                <div className="text-lg font-semibold text-text-heading">Tạo lớp (Teacher)</div>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Tên lớp (VD: DSA K66)"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    onClick={createClass}
                    disabled={busy || newClassName.trim().length === 0}
                  >
                    Tạo
                  </Button>
                </div>
              </Card>
            )
          : null}

        <Card className="p-5 md:p-6">
          <div className="text-lg font-semibold text-text-heading">Join lớp (Student)</div>
          <div className="mt-3 flex gap-2">
            <Input
              className="uppercase"
              placeholder="Nhập class code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={joinClass}
              disabled={busy || joinCode.trim().length === 0}
            >
              Join
            </Button>
          </div>
        </Card>
      </div>

      {error
        ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )
        : null}

      <Card className="mt-1 p-5 md:p-6">
        <div className="text-lg font-semibold text-text-heading">Các lớp của bạn</div>
        {props.role === 'teacher'
          ? (
              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                <div className="text-sm text-text-muted md:w-40">Tên session</div>
                <Input
                  placeholder="VD: Quiz tuần 1"
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  disabled={busy}
                />
              </div>
            )
          : null}
        <div className="mt-3 grid gap-2">
          {classes.length === 0
            ? (
                <div className="text-sm text-text-muted">Chưa có lớp nào.</div>
              )
            : classes.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-section px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-sm text-text-muted">
                      Code:
                      {' '}
                      <span className="font-mono">{c.classCode}</span>
                    </div>
                    {props.role === 'teacher'
                      ? (
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              className="rounded-md border border-border-subtle bg-bg-card px-2 py-1 text-xs text-text-body"
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
                        )
                      : null}
                  </div>
                  {props.role === 'teacher'
                    ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy || sessionTitle.trim().length === 0}
                          onClick={() => void createSession(c.id)}
                        >
                          Tạo session
                        </Button>
                      )
                    : null}
                </div>
              ))}
        </div>
      </Card>
    </div>
  );
}
