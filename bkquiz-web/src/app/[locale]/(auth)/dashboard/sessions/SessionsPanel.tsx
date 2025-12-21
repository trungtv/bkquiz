'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

type Session = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  quiz: {
    id: string;
    title: string;
  };
  attempt?: {
    id: string;
    status: string;
    submittedAt: string | null;
    score: number | null;
    createdAt: string;
  };
  attemptCount?: number;
};

export function SessionsPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) {
          throw new Error('Failed to load sessions');
        }
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function getStatusBadge(status: Session['status']) {
    switch (status) {
      case 'lobby':
        return <Badge variant="neutral">Lobby</Badge>;
      case 'active':
        return <Badge variant="success">Đang diễn ra</Badge>;
      case 'ended':
        return <Badge variant="info">Đã kết thúc</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="space-y-7">
        <Card className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-text-muted">Lỗi</div>
        <div className="mt-2 text-text-body">{error}</div>
      </Card>
    );
  }

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status === 'ended');
  const lobbySessions = sessions.filter(s => s.status === 'lobby');

  return (
    <div className="space-y-7">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-text-muted">BKquiz Sessions</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              My Sessions
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              Xem và quản lý các session bạn đang tham gia hoặc đã tham gia.
            </div>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Đang diễn ra ({activeSessions.length})
          </div>
          <div className="space-y-3">
            {activeSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-text-heading">
                      {session.quiz.title}
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Bắt đầu: {formatDate(session.startedAt)}
                  </div>
                  {session.attempt && (
                    <div className="mt-1 text-xs text-text-muted">
                      Attempt: {session.attempt.status}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {session.attempt
                    ? (
                        <Link href={`/attempt/${session.attempt.id}`}>
                          <Button variant="primary" size="sm">
                            Tiếp tục
                          </Button>
                        </Link>
                      )
                    : (
                        <Link href={`/session/${session.id}`}>
                          <Button variant="primary" size="sm">
                            Join
                          </Button>
                        </Link>
                      )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lobby Sessions */}
      {lobbySessions.length > 0 && (
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Chờ bắt đầu ({lobbySessions.length})
          </div>
          <div className="space-y-3">
            {lobbySessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-text-heading">
                      {session.quiz.title}
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Tạo lúc: {formatDate(session.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/session/${session.id}`}>
                    <Button variant="ghost" size="sm">
                      Xem lobby
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Đã kết thúc ({pastSessions.length})
          </div>
          <div className="space-y-3">
            {pastSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-text-heading">
                      {session.quiz.title}
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Kết thúc: {formatDate(session.endedAt)}
                  </div>
                  {session.attempt && (
                    <div className="mt-1 text-xs text-text-muted">
                      {session.attempt.submittedAt
                        ? (
                            <>
                              Đã nộp: {formatDate(session.attempt.submittedAt)}
                              {session.attempt.score !== null && (
                                <span className="ml-2">
                                  · Điểm: <span className="font-mono">{session.attempt.score.toFixed(1)}</span>
                                </span>
                              )}
                            </>
                          )
                        : (
                            'Chưa nộp'
                          )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {session.attempt
                    ? (
                        <Link href={`/attempt/${session.attempt.id}`}>
                          <Button variant="ghost" size="sm">
                            Xem kết quả
                          </Button>
                        </Link>
                      )
                    : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="p-6">
          <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
            <div className="text-sm text-text-muted">
              Chưa có session nào.
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Tham gia lớp học để được mời vào các session.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

