'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

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

  async function updateQuizStatus(quizId: string, status: QuizLite['status']) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'UPDATE_STATUS_FAILED');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-text-heading">Ngân hàng quiz</div>
            <div className="mt-1 text-sm text-text-muted">
              Chọn lớp và tạo quiz cho từng buổi học.
            </div>
          </div>
          {classroom
            ? (
                <Badge variant="info">
                  Lớp hiện tại:
                  {' '}
                  <span className="font-mono">{classroom.classCode}</span>
                </Badge>
              )
            : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm" htmlFor="quizClassroom">
            <div className="font-medium text-text-muted">Chọn lớp</div>
            <select
              id="quizClassroom"
              className="rounded-md border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
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

          <label className="grid gap-1 text-sm" htmlFor="quizTitle">
            <div className="font-medium text-text-muted">Tạo quiz (draft)</div>
            <div className="flex gap-2">
              <Input
                id="quizTitle"
                className="w-full"
                placeholder="VD: Quiz tuần 1"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={busy}
              />
              <Button
                variant="primary"
                disabled={busy || title.trim().length === 0 || !classroom || (classroom.roleInClass !== 'teacher' && classroom.roleInClass !== 'ta')}
                onClick={() => void createQuiz()}
              >
                Tạo
              </Button>
            </div>
          </label>
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
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-text-heading">Danh sách quiz</div>
            <div className="mt-1 text-sm text-text-muted">
              Mỗi quiz tương ứng với một cấu hình rules và session.
            </div>
          </div>
          <div className="text-xs text-text-muted">
            Tổng:
            {' '}
            <span className="font-mono">{quizzes.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {quizzes.length === 0
            ? (
                <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
                  Chưa có quiz nào cho lớp này.
                  {' '}
                  <span className="font-medium text-text-heading">Tạo quiz draft ở phía trên để bắt đầu.</span>
                </div>
              )
            : quizzes.map(q => (
                <Card key={q.id} interactive className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-heading">{q.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <Badge
                        variant={q.status === 'published' ? 'success' : (q.status === 'archived' ? 'neutral' : 'warning')}
                      >
                        {q.status}
                      </Badge>
                      <span className="font-mono">
                        Cập nhật:
                        {' '}
                        {new Date(q.updatedAt).toLocaleString()}
                      </span>
                      {typeof q.ruleCount === 'number'
                        ? (
                            <span className="font-mono">
                              · rules:
                              {' '}
                              {q.ruleCount}
                            </span>
                          )
                        : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {q.status === 'draft'
                      ? (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busy}
                            onClick={() => void updateQuizStatus(q.id, 'published')}
                          >
                            Publish
                          </Button>
                        )
                      : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        window.location.href = `/dashboard/quizzes/${q.id}`;
                      }}
                    >
                      Mở
                    </Button>
                  </div>
                </Card>
              ))}
        </div>
      </Card>
    </div>
  );
}
// EOF
