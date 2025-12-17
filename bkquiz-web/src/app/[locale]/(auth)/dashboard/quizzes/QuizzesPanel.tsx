'use client';

import { useEffect, useMemo, useState } from 'react';

type ClassroomLite = {
  id: string;
  name: string;
  classCode: string;
  roleInClass: 'student' | 'ta' | 'teacher';
};

type QuizLite = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  ruleCount?: number;
};

export function QuizzesPanel(props: { classrooms: ClassroomLite[] }) {
  const [classroomId, setClassroomId] = useState<string>(props.classrooms[0]?.id ?? '');
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classroom = useMemo(() => props.classrooms.find(c => c.id === classroomId) ?? null, [props.classrooms, classroomId]);

  async function load() {
    if (!classroomId) {
      return;
    }
    const res = await fetch(`/api/quizzes?classroomId=${encodeURIComponent(classroomId)}`, { method: 'GET' });
    const json = await res.json() as { quizzes?: QuizLite[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? 'LOAD_FAILED');
      return;
    }
    setError(null);
    setQuizzes(json.quizzes ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  async function createQuiz() {
    if (!classroomId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classroomId, title, status: 'draft' }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? 'CREATE_FAILED');
        return;
      }
      setTitle('');
      await load();
      window.location.href = `/dashboard/quizzes/${json.id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Quizzes</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <div className="font-medium text-gray-700">Chọn lớp</div>
            <select
              className="rounded-md border px-3 py-2"
              value={classroomId}
              onChange={e => setClassroomId(e.target.value)}
              disabled={busy}
            >
              {props.classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {' '}
                  (
                  {c.classCode}
                  )
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <div className="font-medium text-gray-700">Tạo quiz (draft)</div>
            <div className="flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="VD: Quiz tuần 1"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                disabled={busy || title.trim().length === 0 || !classroom || (classroom.roleInClass !== 'teacher' && classroom.roleInClass !== 'ta')}
                onClick={() => void createQuiz()}
              >
                Tạo
              </button>
            </div>
          </label>
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
        <div className="text-lg font-semibold">Danh sách quiz</div>
        <div className="mt-3 grid gap-2">
          {quizzes.length === 0
            ? (
                <div className="text-sm text-gray-600">Chưa có quiz nào.</div>
              )
            : (
                quizzes.map(q => (
                  <div key={q.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{q.title}</div>
                      <div className="text-sm text-gray-600">
                        <span className="font-mono">{q.status}</span>
                        {' '}
                        ·
                        {' '}
                        <span className="font-mono">{new Date(q.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <a className="text-sm font-medium text-blue-700 hover:underline" href={`/dashboard/quizzes/${q.id}`}>
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
// EOF
