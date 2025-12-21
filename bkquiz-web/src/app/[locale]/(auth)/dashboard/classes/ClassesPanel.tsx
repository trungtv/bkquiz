'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';

type ClassroomLite = {
  id: string;
  name: string;
  classCode: string;
  createdAt: string;
  ownerTeacherId: string;
  roleInClass: 'student' | 'ta' | 'teacher';
  joinedAt: string;
  memberCount: number;
};

type ClassesPanelProps = {
  role: 'teacher' | 'student';
};

export function ClassesPanel(props: ClassesPanelProps) {
  const { role } = props;
  const [classes, setClasses] = useState<ClassroomLite[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const stats = useMemo(() => {
    const owned = classes.filter(c => c.roleInClass === 'teacher').length;
    const joined = classes.filter(c => c.roleInClass !== 'teacher').length;
    return { total: classes.length, owned, joined };
  }, [classes]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  async function load() {
    const res = await fetch('/api/classes', { method: 'GET' });
    const json = await res.json() as { classes?: ClassroomLite[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? 'LOAD_FAILED');
      return;
    }
    setError(null);
    setClasses(json.classes ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createClass() {
    if (newClassName.trim().length === 0) {
      setError('Vui lòng nhập tên lớp');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newClassName }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? 'CREATE_FAILED');
        return;
      }
      setNewClassName('');
      setToast({ message: 'Đã tạo lớp thành công', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function joinClass() {
    if (joinCode.trim().length === 0) {
      setError('Vui lòng nhập class code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classCode: joinCode }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? 'JOIN_FAILED');
        return;
      }
      setJoinCode('');
      setToast({ message: 'Đã join lớp thành công', type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm animate-fadeIn">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <span className="text-text-heading">Classes</span>
          <Badge
            variant={role === 'teacher' ? 'success' : 'info'}
            className="text-[10px] px-1.5 py-0.5 ml-2"
          >
            {role === 'teacher' ? 'Teacher' : 'Student'}
          </Badge>
        </div>
      </nav>

      {/* Header */}
      <Card className="p-5 md:p-6 animate-slideUp">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-heading">Classes</h1>
            <div className="mt-1 text-sm text-text-muted">
              {role === 'teacher'
                ? 'Quản lý các lớp học của bạn'
                : 'Các lớp bạn đang tham gia'}
            </div>
          </div>
        </div>

        {role === 'teacher'
          ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm" htmlFor="newClassName">
                  <div className="font-medium text-text-muted">Tạo lớp mới</div>
                  <div className="flex gap-2">
                    <Input
                      id="newClassName"
                      className="w-full"
                      placeholder="VD: Toán 10A"
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void createClass();
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      disabled={busy || newClassName.trim().length === 0}
                      onClick={() => void createClass()}
                      className="hover:scale-105"
                    >
                      Tạo
                    </Button>
                  </div>
                </label>

                <label className="grid gap-1 text-sm" htmlFor="joinCode">
                  <div className="font-medium text-text-muted">Join lớp bằng code</div>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      className="w-full"
                      placeholder="VD: ABC123"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void joinClass();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      disabled={busy || joinCode.trim().length === 0}
                      onClick={() => void joinClass()}
                      className="hover:scale-105"
                    >
                      Join
                    </Button>
                  </div>
                </label>
              </div>
            )
          : (
              <div className="mt-4">
                <label className="grid gap-1 text-sm" htmlFor="joinCode">
                  <div className="font-medium text-text-muted">Join lớp bằng code</div>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      className="w-full"
                      placeholder="VD: ABC123"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void joinClass();
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      disabled={busy || joinCode.trim().length === 0}
                      onClick={() => void joinClass()}
                      className="bg-indigo-500 hover:bg-indigo-600 hover:scale-105"
                    >
                      Join
                    </Button>
                  </div>
                </label>
              </div>
            )}

        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      {/* Stats Cards */}
      {classes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 animate-slideUp" style={{ animationDelay: '50ms' }}>
          <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="text-xs text-text-muted">Tổng lớp</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.total}</div>
          </Card>
          {role === 'teacher'
            ? (
                <>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                    <div className="text-xs text-text-muted">Lớp bạn tạo</div>
                    <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.owned}</div>
                  </Card>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                    <div className="text-xs text-text-muted">Lớp đã join</div>
                    <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.joined}</div>
                  </Card>
                </>
              )
            : (
                <>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-indigo-500/20">
                    <div className="text-xs text-text-muted">Active Sessions</div>
                    <div className="mt-1 text-2xl font-semibold text-indigo-400">
                      {classes.filter(c => c.roleInClass !== 'teacher').length}
                    </div>
                  </Card>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-indigo-500/20">
                    <div className="text-xs text-text-muted">Total Members</div>
                    <div className="mt-1 text-2xl font-semibold text-indigo-400">
                      {classes.reduce((sum, c) => sum + c.memberCount, 0)}
                    </div>
                  </Card>
                </>
              )}
        </div>
      )}

      {/* Classes List */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-text-heading">
              {role === 'teacher' ? 'My Classes' : 'My Classes'}
            </div>
            <div className="mt-1 text-sm text-text-muted">
              {classes.length}
              {' '}
              lớp
            </div>
          </div>
        </div>

        {classes.length === 0
          ? (
              <div className="mt-6 rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                <div className="text-sm text-text-muted">
                  Chưa có lớp nào.
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {role === 'teacher'
                    ? 'Tạo lớp mới hoặc join lớp bằng class code ở phía trên.'
                    : 'Join lớp bằng class code ở phía trên.'}
                </div>
              </div>
            )
          : (
              <div className="mt-4 space-y-2">
                {classes.map((c, idx) => (
                  <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
                    <div
                      className={`rounded-md border bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
                        c.roleInClass === 'teacher'
                          ? 'border-primary/30 hover:border-primary/50'
                          : 'border-indigo-500/30 hover:border-indigo-500/50'
                      }`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto] items-center gap-4 md:grid-cols-[2fr_120px_100px]">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-text-heading">{c.name}</div>
                            <div className="mt-1 text-xs text-text-muted">
                              {c.memberCount}
                              {' '}
                              thành viên
                            </div>
                          </div>
                          <Badge
                            variant={c.roleInClass === 'teacher' ? 'success' : (c.roleInClass === 'ta' ? 'info' : 'neutral')}
                            className="text-xs"
                          >
                            {c.roleInClass === 'teacher' ? 'Owner' : (c.roleInClass === 'ta' ? 'TA' : 'Student')}
                          </Badge>
                          <div className="text-xs text-text-muted">
                            <span className="font-mono">{c.classCode}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">→</span>
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

