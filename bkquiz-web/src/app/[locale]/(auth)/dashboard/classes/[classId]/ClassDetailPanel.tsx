'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';

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

type QuizLite = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  ruleCount: number;
};

type ClassDetailPanelProps = {
  classId: string;
  role: 'teacher' | 'student';
};

export function ClassDetailPanel(props: ClassDetailPanelProps) {
  const { classId, role } = props;
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'sessions' | 'settings'>('members');
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [createSessionBusy, setCreateSessionBusy] = useState(false);
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
    const res = await fetch(`/api/classes/${classId}`, { method: 'GET' });
    const json = await res.json() as ClassInfo | { error?: string };
    if (!res.ok) {
      return;
    }
    setClassInfo(json as ClassInfo);
  }

  async function loadMembers() {
    const res = await fetch(`/api/classes/${classId}/members`, { method: 'GET' });
    const json = await res.json() as { members?: Member[]; error?: string };
    if (!res.ok) {
      return;
    }
    setMembers(json.members ?? []);
  }

  async function loadSessions() {
    const res = await fetch(`/api/classes/${classId}/sessions`, { method: 'GET' });
    const json = await res.json() as { sessions?: Session[]; error?: string };
    if (!res.ok) {
      return;
    }
    setSessions(json.sessions ?? []);
  }

  async function loadQuizzes() {
    if (role !== 'teacher') {
      return;
    }
    const res = await fetch('/api/quizzes', { method: 'GET' });
    const json = await res.json() as { quizzes?: QuizLite[]; error?: string };
    if (!res.ok) {
      return;
    }
    setQuizzes(json.quizzes ?? []);
  }

  async function createSession() {
    if (!selectedQuizId) {
      setCreateSessionError('Vui lòng chọn quiz');
      return;
    }
    const quiz = quizzes.find(q => q.id === selectedQuizId);
    if (quiz && quiz.ruleCount === 0) {
      setCreateSessionError('Quiz này chưa có rule. Vào Quizzes để cấu hình rule trước.');
      return;
    }
    setCreateSessionBusy(true);
    setCreateSessionError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          classroomId: classId,
          quizId: selectedQuizId,
        }),
      });
      const json = await res.json() as { sessionId?: string; error?: string };
      if (!res.ok || !json.sessionId) {
        setCreateSessionError(json.error ?? 'CREATE_SESSION_FAILED');
        return;
      }
      setShowCreateSessionModal(false);
      setSelectedQuizId('');
      setToast({ message: 'Đã tạo session thành công', type: 'success' });
      await loadSessions();
      // Redirect to teacher screen after a short delay
      setTimeout(() => {
        router.push(`/dashboard/sessions/${json.sessionId}/teacher`);
      }, 1000);
    } catch {
      setCreateSessionError('Không tạo được session. Vui lòng thử lại.');
    } finally {
      setCreateSessionBusy(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadClassInfo(), loadMembers(), loadSessions(), loadQuizzes()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, role]);

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
  const isStudent = classInfo.userRole === 'student';

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="text-sm animate-slideUp">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/dashboard/classes" className="hover:text-text-heading transition-colors">
            Classes
          </Link>
          <span>·</span>
          <span className="text-text-heading">{classInfo.name}</span>
          <Badge
            variant={role === 'teacher' ? 'success' : 'info'}
            className="text-[10px] px-1.5 py-0.5 ml-2"
          >
            {role === 'teacher' ? 'Teacher' : 'Student'}
          </Badge>
        </div>
      </nav>

      {/* Class Header */}
      <Card
        className={`p-5 md:p-6 animate-slideUp transition-all duration-200 hover:shadow-lg ${
          isOwner ? 'border-primary/20' : 'border-indigo-500/20'
        }`}
        style={{ animationDelay: '50ms' }}
      >
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
            {isOwner && (
              <Button
                variant="primary"
                size="sm"
                className="hover:scale-105"
                onClick={() => setShowCreateSessionModal(true)}
              >
                + Tạo Session
              </Button>
            )}
            <Link href="/dashboard/classes">
              <Button variant="ghost" size="sm" className="hover:scale-105">
                ← Quay lại
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div
        className="grid gap-4 md:grid-cols-4 animate-slideUp"
        style={{ animationDelay: '100ms' }}
      >
        <Card
          className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
            isOwner ? '' : 'border-indigo-500/20'
          }`}
        >
          <div className="text-xs text-text-muted">Thành viên</div>
          <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
            {members.length}
          </div>
        </Card>
        <Card
          className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
            isOwner ? '' : 'border-indigo-500/20'
          }`}
        >
          <div className="text-xs text-text-muted">Tổng sessions</div>
          <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
            {sessions.length}
          </div>
        </Card>
        <Card
          className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
            isOwner ? '' : 'border-indigo-500/20'
          }`}
        >
          <div className="text-xs text-text-muted">Active sessions</div>
          <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
            {sessions.filter(s => s.status === 'active').length}
          </div>
        </Card>
        <Card
          className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
            isOwner ? '' : 'border-indigo-500/20'
          }`}
        >
          <div className="text-xs text-text-muted">Ended sessions</div>
          <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
            {sessions.filter(s => s.status === 'ended').length}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card
        className={`p-5 md:p-6 animate-slideUp ${
          isOwner ? '' : 'border-indigo-500/20'
        }`}
        style={{ animationDelay: '150ms' }}
      >
        <div className="flex gap-2 border-b border-border-subtle">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? `border-b-2 text-text-heading ${isOwner ? 'border-primary' : 'border-indigo-500'}`
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
                ? `border-b-2 text-text-heading ${isOwner ? 'border-primary' : 'border-indigo-500'}`
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            {isStudent ? 'My Sessions' : 'Sessions'}
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
              {isOwner && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-medium text-text-heading">
                    {members.length}
                    {' '}
                    thành viên
                  </div>
                  <Button variant="primary" size="sm" className="hover:scale-105">
                    + Add Member
                  </Button>
                </div>
              )}
              {members.length === 0
                ? (
                    <div className="text-center py-8 text-sm text-text-muted">
                      Chưa có thành viên nào.
                    </div>
                  )
                : members.map((m, idx) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md"
                      style={{ animationDelay: `${idx * 30}ms` }}
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
              {isOwner && sessions.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-medium text-text-heading">
                    {sessions.length}
                    {' '}
                    sessions
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="hover:scale-105"
                    onClick={() => setShowCreateSessionModal(true)}
                  >
                    + Create Session
                  </Button>
                </div>
              )}
              {sessions.length === 0
                ? (
                    <div className="text-center py-8 text-sm text-text-muted">
                      Chưa có session nào.
                      {isOwner && (
                        <div className="mt-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="hover:scale-105"
                            onClick={() => setShowCreateSessionModal(true)}
                          >
                            Tạo session đầu tiên
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                : sessions.map((s, idx) => {
                    // Student: link to session lobby or attempt
                    // Teacher: link to teacher screen
                    const href = isStudent
                      ? `/session/${s.id}`
                      : `/dashboard/sessions/${s.id}/teacher`;

                    return (
                      <Link key={s.id} href={href}>
                        <div
                          className={`flex items-center justify-between gap-4 rounded-md border bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
                            isStudent
                              ? 'border-indigo-500/30 hover:border-indigo-500/50'
                              : 'border-border-subtle hover:border-border-strong'
                          }`}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-text-heading">
                              {s.quiz.title}
                            </div>
                            <div className="mt-1 text-xs text-text-muted">
                              {isStudent
                                ? (
                                    <>
                                      {s.status === 'active' && 'Đang diễn ra'}
                                      {s.status === 'ended' && 'Đã kết thúc'}
                                      {s.status === 'lobby' && 'Chờ bắt đầu'}
                                    </>
                                  )
                                : (
                                    <>
                                      {s.attemptCount}
                                      {' '}
                                      attempts
                                    </>
                                  )}
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
                    );
                  })}
              {isStudent && sessions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <Link href="/dashboard/sessions">
                    <Button variant="ghost" size="sm" className="w-full">
                      Xem tất cả sessions của tôi
                    </Button>
                  </Link>
                </div>
              )}
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

      {/* Create Session Modal */}
      {showCreateSessionModal && isOwner && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-heading">Tạo Session</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateSessionModal(false);
                  setSelectedQuizId('');
                  setCreateSessionError(null);
                }}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="quizSelect" className="mb-2 block text-sm font-medium text-text-heading">
                  Chọn Quiz
                </label>
                {quizzes.length === 0
                  ? (
                      <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-muted">
                        Chưa có quiz nào.
                        <div className="mt-2">
                          <Link href="/dashboard/quizzes">
                            <Button variant="primary" size="sm" className="hover:scale-105">
                              Tạo quiz mới
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  : (
                      <select
                        id="quizSelect"
                        value={selectedQuizId}
                        onChange={e => setSelectedQuizId(e.target.value)}
                        className="w-full rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-body transition-colors hover:border-border-strong focus:border-primary focus:outline-none"
                      >
                        <option value="">-- Chọn quiz --</option>
                        {quizzes.map(q => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                            {' '}
                            (
                            {q.status}
                            )
                            {q.ruleCount === 0 && ' ⚠️ Chưa có rule'}
                          </option>
                        ))}
                      </select>
                    )}
              </div>

              {createSessionError && (
                <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                  {createSessionError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateSessionModal(false);
                    setSelectedQuizId('');
                    setCreateSessionError(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={createSessionBusy || !selectedQuizId}
                  onClick={() => void createSession()}
                >
                  {createSessionBusy ? 'Đang tạo...' : 'Tạo Session'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

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
