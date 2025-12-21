'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TagFilter } from '@/components/ui/TagFilter';
import { Toast } from '@/components/ui/Toast';

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
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
};

export function QuizzesPanel(_props: { classrooms: ClassroomLite[] }) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [tagFilter, setTagFilter] = useState('');

  const stats = useMemo(() => {
    const draft = quizzes.filter(q => q.status === 'draft').length;
    const published = quizzes.filter(q => q.status === 'published').length;
    const archived = quizzes.filter(q => q.status === 'archived').length;
    return { total: quizzes.length, draft, published, archived };
  }, [quizzes]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  async function load() {
    const url = new URL('/api/quizzes', window.location.origin);
    if (tagFilter.trim()) {
      url.searchParams.set('tags', tagFilter.trim());
    }
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        const text = await res.text();
        let json: { quizzes?: QuizLite[]; error?: string };
        try {
          json = JSON.parse(text);
        } catch {
          setError(`LOAD_FAILED: ${res.status} ${res.statusText}`);
          return;
        }
        setError(json.error ?? 'LOAD_FAILED');
        return;
      }
      const text = await res.text();
      if (!text) {
        setError('LOAD_FAILED: Empty response');
        return;
      }
      let json: { quizzes?: QuizLite[]; error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError('LOAD_FAILED: Invalid JSON response');
        console.error('Failed to parse response:', text, err);
        return;
      }
      setError(null);
      setQuizzes(json.quizzes ?? []);
    } catch (err) {
      setError(`LOAD_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error loading quizzes:', err);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter]);

  async function createQuiz() {
    if (title.trim().length === 0) {
      setError('Vui lòng nhập tên quiz');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, status: 'draft' }),
      });
      if (!res.ok) {
        let errorMessage = 'CREATE_FAILED';
        try {
          const errorJson = await res.json() as { error?: string };
          errorMessage = errorJson.error ?? 'CREATE_FAILED';
        } catch {
          // Response không phải JSON, dùng message mặc định
        }
        setError(errorMessage);
        return;
      }
      const json = await res.json() as { id?: string; error?: string };
      if (!json.id) {
        setError(json.error ?? 'CREATE_FAILED');
        return;
      }
      setTitle('');
      setToast({ message: 'Đã tạo quiz thành công', type: 'success' });
      await load();
      // Delay redirect để user thấy toast
      setTimeout(() => {
        router.push(`/dashboard/quizzes/${json.id}`);
      }, 500);
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
        setToast({ message: 'Không thể publish quiz', type: 'error' });
        return;
      }
      setToast({ message: 'Đã publish quiz thành công', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading">
            Dashboard
          </Link>
          <span>·</span>
          <span className="text-text-heading">Quizzes</span>
        </div>
      </nav>

      {/* Header */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-heading">Quizzes</h1>
            <div className="mt-1 text-sm text-text-muted">
              Quản lý quiz của bạn. Quiz có thể được sử dụng cho nhiều lớp học.
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="grid gap-1 text-sm" htmlFor="quizTitle">
            <div className="font-medium text-text-muted">Tạo quiz mới (draft)</div>
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
                disabled={busy || title.trim().length === 0}
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

      {/* Stats Cards */}
      {quizzes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-xs text-text-muted">Tổng quiz</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-text-muted">Draft</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.draft}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-text-muted">Published</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.published}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-text-muted">Archived</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.archived}</div>
          </Card>
        </div>
      )}

      {/* Tag Filter */}
      <Card className="p-5 md:p-6">
        <TagFilter
          value={tagFilter}
          onChange={setTagFilter}
          onClear={() => setTagFilter('')}
        />
      </Card>

      {/* Quiz List */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-text-heading">Danh sách quiz</div>
            <div className="mt-1 text-sm text-text-muted">
              Mỗi quiz tương ứng với một cấu hình rules và session.
            </div>
          </div>
        </div>

        {quizzes.length === 0
          ? (
              <div className="mt-6 rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                <div className="text-sm text-text-muted">
                  Chưa có quiz nào.
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Tạo quiz draft ở phía trên để bắt đầu.
                </div>
              </div>
            )
          : (
              <div className="mt-4 space-y-2">
                {quizzes.map((q, idx) => (
                  <Link key={q.id} href={`/dashboard/quizzes/${q.id}`}>
                    <div
                      className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-text-heading">{q.title}</div>
                            {typeof q.ruleCount === 'number' && (
                              <div className="mt-1 text-xs text-text-muted">
                                {q.ruleCount}
                                {' '}
                                lượt chọn câu
                              </div>
                            )}
                          </div>
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {q.tags.slice(0, 5).map(tag => (
                                <Badge key={tag.id} variant="neutral" className="text-xs">
                                  {tag.name}
                                </Badge>
                              ))}
                              {q.tags.length > 5 && (
                                <Badge variant="neutral" className="text-xs">
                                  +
                                  {q.tags.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                          <Badge
                            variant={q.status === 'published' ? 'success' : (q.status === 'archived' ? 'neutral' : 'warning')}
                            className="text-xs"
                          >
                            {q.status}
                          </Badge>
                          <div className="text-xs text-text-muted">
                            {formatDate(q.updatedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {q.status === 'draft'
                            ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={busy}
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void updateQuizStatus(q.id, 'published');
                                  }}
                                >
                                  Publish
                                </Button>
                              )
                            : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/dashboard/quizzes/${q.id}`);
                            }}
                          >
                            Mở
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
      </Card>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
// EOF
