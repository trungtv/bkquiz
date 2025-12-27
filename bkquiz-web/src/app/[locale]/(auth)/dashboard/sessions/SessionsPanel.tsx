'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
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
  sessionName?: string | null;
  durationSeconds?: number | null;
  scheduledStartAt?: string | null;
  classroom?: {
    id: string;
    name: string;
    classCode: string;
  } | null;
};

export function SessionsPanel() {
  const t = useTranslations('Sessions');
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

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) {
      return '—';
    }
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) {
      return '';
    }
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${Math.floor(seconds / 60)} ${t('minutes')}`;
  }

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status === 'ended');
  const lobbySessions = sessions.filter(s => s.status === 'lobby');

  // Group past sessions by classroom
  const pastSessionsByClass = useMemo(() => {
    const grouped = new Map<string | null, Session[]>();
    for (const session of pastSessions) {
      const classId = session.classroom?.id || null;
      if (!grouped.has(classId)) {
        grouped.set(classId, []);
      }
      grouped.get(classId)!.push(session);
    }
    return grouped;
  }, [pastSessions]);

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
        <div className="text-sm text-text-muted">{t('error')}</div>
        <div className="mt-2 text-text-body">{error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm animate-fadeIn">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            {t('breadcrumb_dashboard')}
          </Link>
          <span>·</span>
          <span className="text-text-heading">{t('title')}</span>
        </div>
      </nav>

      {/* Header */}
      <Card className="p-5 md:p-6 animate-slideUp">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-text-muted">{t('bkquiz_sessions')}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-heading">
              {t('title')}
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              {t('view_and_manage_description')}
            </div>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '50ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">
            {t('ongoing', { count: activeSessions.length })}
          </div>
          <div className="space-y-3">
            {activeSessions.map((session, idx) => (
              <Link key={session.id} href={session.attempt ? `/attempt/${session.attempt.id}` : `/session/${session.id}`}>
                <div
                  className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30 cursor-pointer"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-heading">
                        {session.sessionName || session.quiz.title}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="text-xs text-text-muted">
                          {session.status === 'active' && t('status_active')}
                          {session.durationSeconds && (
                            <>
                              {' '}
                              ·
                              {' '}
                              ⏱️
                              {' '}
                              {formatDuration(session.durationSeconds)}
                            </>
                          )}
                        </div>
                        {((session.startedAt || session.scheduledStartAt) || session.endedAt) && (
                          <div className="text-xs text-text-muted/80">
                            {(session.startedAt || session.scheduledStartAt) && (
                              <>
                                {session.status === 'lobby' ? t('start_time') : t('started')}
                                {' '}
                                {formatDateShort(session.startedAt || session.scheduledStartAt!)}
                              </>
                            )}
                            {session.endedAt && session.status === 'ended' && (
                              <>
                                {(session.startedAt || session.scheduledStartAt) && ' · '}
                                {t('end_time')}
                                {' '}
                                {formatDateShort(session.endedAt)}
                              </>
                            )}
                          </div>
                        )}
                        {session.classroom && (
                          <div className="text-xs text-text-muted/80">
                            📚 {session.classroom.name} ({session.classroom.classCode})
                          </div>
                        )}
                        {session.attempt && (
                          <div className="text-xs text-text-muted/80">
                            Attempt: {session.attempt.status}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={session.status === 'active' ? 'success' : (session.status === 'ended' ? 'neutral' : 'info')}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <span className="text-xs text-text-muted">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Lobby Sessions */}
      {lobbySessions.length > 0 && (
        <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">
            {t('waiting_to_start', { count: lobbySessions.length })}
          </div>
          <div className="space-y-3">
            {lobbySessions.map((session, idx) => (
              <Link key={session.id} href={`/session/${session.id}`}>
                <div
                  className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30 cursor-pointer"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-heading">
                        {session.sessionName || session.quiz.title}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="text-xs text-text-muted">
                          {session.status === 'lobby' && t('status_lobby')}
                          {session.durationSeconds && (
                            <>
                              {' '}
                              ·
                              {' '}
                              ⏱️
                              {' '}
                              {formatDuration(session.durationSeconds)}
                            </>
                          )}
                        </div>
                        {((session.startedAt || session.scheduledStartAt) || session.endedAt) && (
                          <div className="text-xs text-text-muted/80">
                            {(session.startedAt || session.scheduledStartAt) && (
                              <>
                                {session.status === 'lobby' ? t('start_time') : t('started')}
                                {' '}
                                {formatDateShort(session.startedAt || session.scheduledStartAt!)}
                              </>
                            )}
                            {session.endedAt && session.status === 'ended' && (
                              <>
                                {(session.startedAt || session.scheduledStartAt) && ' · '}
                                {t('end_time')}
                                {' '}
                                {formatDateShort(session.endedAt)}
                              </>
                            )}
                          </div>
                        )}
                        {session.classroom && (
                          <div className="text-xs text-text-muted/80">
                            📚 {session.classroom.name} ({session.classroom.classCode})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={session.status === 'active' ? 'success' : (session.status === 'ended' ? 'neutral' : 'info')}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <span className="text-xs text-text-muted">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Past Sessions - Grouped by Class */}
      {pastSessions.length > 0 && (
        <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">
            {t('ended', { count: pastSessions.length })}
          </div>
          <div className="space-y-6">
            {Array.from(pastSessionsByClass.entries()).map(([classId, classSessions], groupIdx) => {
              const classroom = classSessions[0]?.classroom;
              return (
                <div key={classId || 'no-class'} className="space-y-3">
                  {/* Class Header */}
                  {classroom
                    ? (
                        <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                          <Link
                            href={`/dashboard/classes/${classroom.id}`}
                            className="text-sm font-semibold text-text-heading hover:text-primary transition-colors cursor-pointer"
                          >
                            📚 {classroom.name}
                          </Link>
                          <Badge variant="neutral" className="text-xs">
                            {classSessions.length} {classSessions.length > 1 ? t('sessions') : t('session')}
                          </Badge>
                        </div>
                      )
                    : (
                        <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                          <span className="text-sm font-semibold text-text-muted">
                            {t('other')}
                          </span>
                          <Badge variant="neutral" className="text-xs">
                            {classSessions.length} {classSessions.length > 1 ? t('sessions') : t('session')}
                          </Badge>
                        </div>
                      )}
                  {/* Sessions in this class */}
                  <div className="space-y-3 pl-4">
                    {classSessions.map((session, idx) => (
                      <Link
                        key={session.id}
                        href={session.attempt ? `/attempt/${session.attempt.id}` : `/session/${session.id}`}
                      >
                        <div
                          className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30 cursor-pointer"
                          style={{ animationDelay: `${(groupIdx * 100) + (idx * 30)}ms` }}
                        >
                          <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-text-heading">
                                {session.sessionName || session.quiz.title}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                <div className="text-xs text-text-muted">
                                  {session.status === 'ended' && t('status_ended')}
                                  {session.durationSeconds && (
                                    <>
                                      {' '}
                                      ·
                                      {' '}
                                      ⏱️
                                      {' '}
                                      {formatDuration(session.durationSeconds)}
                                    </>
                                  )}
                                </div>
                                {((session.startedAt || session.scheduledStartAt) || session.endedAt) && (
                                  <div className="text-xs text-text-muted/80">
                                    {(session.startedAt || session.scheduledStartAt) && (
                                      <>
                                        {t('started')}
                                        {' '}
                                        {formatDateShort(session.startedAt || session.scheduledStartAt!)}
                                      </>
                                    )}
                                    {session.endedAt && session.status === 'ended' && (
                                      <>
                                        {(session.startedAt || session.scheduledStartAt) && ' · '}
                                        {t('end_time')}
                                        {' '}
                                        {formatDateShort(session.endedAt)}
                                      </>
                                    )}
                                  </div>
                                )}
                                {session.classroom && (
                                  <div className="text-xs text-text-muted/80">
                                    📚 {session.classroom.name} ({session.classroom.classCode})
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Score display for ended sessions with attempt - centered */}
                            {session.attempt && session.attempt.score !== null && (
                              <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 border border-primary/30">
                                <div className="text-sm font-medium text-text-muted uppercase tracking-wide">
                                  {t('score')}
                                </div>
                                <div className="text-2xl font-bold text-primary tabular-nums">
                                  {session.attempt.score.toFixed(1)}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge
                                variant={session.status === 'active' ? 'success' : (session.status === 'ended' ? 'neutral' : 'info')}
                                className="text-xs"
                              >
                                {session.status}
                              </Badge>
                              <span className="text-xs text-text-muted">→</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
            <div className="text-sm text-text-muted">
              {t('no_sessions')}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('join_class_hint')}
            </div>
            <div className="mt-4">
              <Link href="/dashboard/classes">
                <Button variant="primary" size="sm" className="hover:scale-105">
                  {t('join_class')}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
