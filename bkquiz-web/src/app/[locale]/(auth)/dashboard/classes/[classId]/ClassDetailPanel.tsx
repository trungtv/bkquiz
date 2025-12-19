'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type ClassInfo = {
  id: string;
  name: string;
  classCode: string;
  createdAt: string;
  updatedAt: string;
  ownerTeacherId: string;
  ownerTeacher: { id: string; name: string | null; email: string | null };
  memberCount: number;
  userRole: 'student' | 'ta' | 'teacher';
  joinedAt: string;
};

type Member = {
  userId: string;
  user: { id: string; name: string | null; email: string | null };
  roleInClass: 'student' | 'ta' | 'teacher';
  joinedAt: string;
};

type Session = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  quiz: { id: string; title: string };
  attemptCount: number;
};

export function ClassDetailPanel(props: { classId: string }) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'sessions' | 'settings'>('members');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function loadClassInfo() {
    const res = await fetch(`/api/classes/${props.classId}`, { method: 'GET' });
    const json = await res.json() as ClassInfo | { error?: string };
    if (!res.ok) {
      setError((json as { error?: string }).error ?? 'LOAD_FAILED');
      return;
    }
    setClassInfo(json as ClassInfo);
  }

  async function loadMembers() {
    const res = await fetch(`/api/classes/${props.classId}/members`, { method: 'GET' });
    const json = await res.json() as { members?: Member[]; error?: string };
    if (!res.ok) {
      return;
    }
    setMembers(json.members ?? []);
  }

  async function loadSessions() {
    const res = await fetch(`/api/classes/${props.classId}/sessions`, { method: 'GET' });
    const json = await res.json() as { sessions?: Session[]; error?: string };
    if (!res.ok) {
      return;
    }
    setSessions(json.sessions ?? []);
  }

  async function load() {
    setBusy(true);
    setError(null);
    try {
      await Promise.all([loadClassInfo(), loadMembers(), loadSessions()]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [props.classId]);

  if (!classInfo) {
    return (
      <div className="space-y-7">
        <Card className="p-5 md:p-6">
          <div className="text-center text-text-muted">Đang tải...</div>
        </Card>
      </div>
    );
  }

  // Owner is determined by userRole === 'teacher' (only owner has teacher role in their own class)
  const isOwner = classInfo.userRole === 'teacher';

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/dashboard/classes" className="hover:text-text-heading">
            Classes
          </Link>
          <span>·</span>
          <span className="text-text-heading">{classInfo.name}</span>
        </div>
      </nav>

      {/* Class Header */}
      <Card className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-text-heading truncate">
                {classInfo.name}
              </h1>
              <Badge variant={isOwner ? 'success' : (classInfo.userRole === 'ta' ? 'info' : 'neutral')}>
                {isOwner ? 'Owner' : (classInfo.userRole === 'ta' ? 'TA' : 'Student')}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <span>
                Class Code:
                {' '}
                <span className="font-mono">{classInfo.classCode}</span>
              </span>
              <span>·</span>
              <span>
                {classInfo.memberCount}
                {' '}
                thành viên
              </span>
              <span>·</span>
              <span>
                Tạo:
                {' '}
                {formatDate(classInfo.createdAt)}
              </span>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Owner:
              {' '}
              {classInfo.ownerTeacher.name ?? classInfo.ownerTeacher.email ?? 'N/A'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/classes">
              <Button variant="ghost" size="sm">
                ← Quay lại
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted">Thành viên</div>
          <div className="mt-1 text-2xl font-semibold text-text-heading">{members.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted">Tổng sessions</div>
          <div className="mt-1 text-2xl font-semibold text-text-heading">{sessions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted">Active sessions</div>
          <div className="mt-1 text-2xl font-semibold text-text-heading">
            {sessions.filter(s => s.status === 'active').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted">Ended sessions</div>
          <div className="mt-1 text-2xl font-semibold text-text-heading">
            {sessions.filter(s => s.status === 'ended').length}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-5 md:p-6">
        <div className="flex gap-2 border-b border-border-subtle">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-b-2 border-primary text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'border-b-2 border-primary text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
          {isOwner && (
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-b-2 border-primary text-text-heading'
                  : 'text-text-muted hover:text-text-heading'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'members' && (
            <div className="space-y-2">
              {members.length === 0
                ? (
                    <div className="text-center py-8 text-sm text-text-muted">
                      Chưa có thành viên nào.
                    </div>
                  )
                : members.map(m => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text-heading">
                          {m.user.name ?? m.user.email ?? 'N/A'}
                        </div>
                        <div className="mt-1 text-xs text-text-muted">
                          {m.user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={m.roleInClass === 'teacher' ? 'success' : (m.roleInClass === 'ta' ? 'info' : 'neutral')}
                          className="text-xs"
                        >
                          {m.roleInClass === 'teacher' ? 'Teacher' : (m.roleInClass === 'ta' ? 'TA' : 'Student')}
                        </Badge>
                        <div className="text-xs text-text-muted">
                          {formatDate(m.joinedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-2">
              {sessions.length === 0
                ? (
                    <div className="text-center py-8 text-sm text-text-muted">
                      Chưa có session nào.
                    </div>
                  )
                : sessions.map(s => (
                    <Link key={s.id} href={`/dashboard/sessions/${s.id}/teacher`}>
                      <div className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-border-strong">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-text-heading">
                            {s.quiz.title}
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {s.attemptCount}
                            {' '}
                            attempts
                            {' '}
                            ·
                            {' '}
                            {formatDate(s.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={s.status === 'active' ? 'success' : (s.status === 'ended' ? 'neutral' : 'info')}
                            className="text-xs"
                          >
                            {s.status}
                          </Badge>
                          <span className="text-xs text-text-muted">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-4">
              <div className="rounded-md border border-border-subtle bg-bg-section p-4">
                <div className="text-sm font-medium text-text-heading">Class Code</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-bg-card px-3 py-2 font-mono text-sm">
                    {classInfo.classCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(classInfo.classCode);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Share class code này để học sinh join lớp.
                </div>
              </div>

              <div className="rounded-md border border-dashed border-border-subtle p-4">
                <div className="text-sm font-medium text-text-heading">Danger Zone</div>
                <div className="mt-2 text-xs text-text-muted">
                  Các thao tác nguy hiểm sẽ được thêm sau (archive, delete).
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

