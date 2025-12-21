'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { ClassHeader } from './shared/ClassHeader';
import { MembersList } from './shared/MembersList';
import { SessionsList } from './shared/SessionsList';
import { StatsCards } from './shared/StatsCards';
import type { ClassInfo, Member, QuizLite, Session } from './types';

type TeacherClassDetailProps = {
  classId: string;
};

export function TeacherClassDetail(props: TeacherClassDetailProps) {
  const { classId } = props;
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
    try {
      const res = await fetch('/api/quizzes', { method: 'GET' });
      if (!res.ok) {
        return;
      }
      const json = await res.json() as { quizzes?: QuizLite[]; error?: string };
      setQuizzes(json.quizzes ?? []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    }
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
  }, [classId]);

  if (!classInfo) {
    return (
      <div className="space-y-7">
        <Card className="p-5 md:p-6">
          <div className="text-center text-text-muted">Đang tải...</div>
        </Card>
      </div>
    );
  }

  const isOwner = classInfo.userRole === 'teacher';

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
          <Badge variant="success" className="text-[10px] px-1.5 py-0.5 ml-2">
            Teacher
          </Badge>
        </div>
      </nav>

      {/* Class Header */}
      <ClassHeader
        classInfo={classInfo}
        isOwner={isOwner}
        onCreateSession={() => setShowCreateSessionModal(true)}
      />

      {/* Stats Cards */}
      <StatsCards members={members} sessions={sessions} isOwner={isOwner} />

      {/* Tabs */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
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
            <MembersList
              members={members}
              isOwner={isOwner}
              onAddMember={() => {
                // TODO: Implement add member
              }}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsList
              sessions={sessions}
              isStudent={false}
              onCreateSession={() => setShowCreateSessionModal(true)}
            />
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
      {showCreateSessionModal && (
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

