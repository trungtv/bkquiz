'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import { getI18nPath } from '@/utils/Helpers';

type SessionStatus = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  totpStepSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  sessionName?: string | null;
  attemptId?: string | null; // null if not joined
  quiz: {
    id: string;
    title: string;
    createdBy: {
      id: string;
      name: string;
    };
  };
  classroom: {
    id: string;
    name: string;
    classCode: string;
  };
};

function formatDuration(startTime: string, locale: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - start) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return locale === 'vi' ? `${minutes} phút` : `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  return locale === 'vi'
    ? `${hours} giờ ${minutes % 60} phút`
    : `${hours} hours ${minutes % 60} minutes`;
}

export function Lobby(props: { sessionId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('SessionLobby');
  const [data, setData] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch(`/api/sessions/${props.sessionId}/status`, { method: 'GET' });
    const json = await res.json() as SessionStatus & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'SESSION_NOT_FOUND');
      return;
    }
    setData(json);
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/join`, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        let json: { attemptId?: string; error?: string };
        try {
          json = JSON.parse(text);
        } catch {
          setError(`JOIN_FAILED: ${res.status} ${res.statusText}`);
          return;
        }
        setError(json.error ?? 'JOIN_FAILED');
        return;
      }
      const text = await res.text();
      if (!text) {
        setError('JOIN_FAILED: Empty response');
        return;
      }
      let json: { attemptId?: string; error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError('JOIN_FAILED: Invalid JSON response');
        console.error('Failed to parse response:', text, err);
        return;
      }
      if (!json.attemptId) {
        setError(json.error ?? 'JOIN_FAILED');
        return;
      }
      // Reload status to get updated attemptId
      await load();
      // If session is active, redirect to attempt page
      // Otherwise, stay in lobby (student has joined, waiting for teacher to start)
      if (data?.status === 'active') {
        router.push(getI18nPath(`/attempt/${json.attemptId}`, locale));
      }
      // If still in lobby, stay here (will show "Đã tham gia" state)
    } catch (err) {
      setError(`JOIN_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error joining session:', err);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // Poll every 3 seconds to check for status changes
    const id = window.setInterval(() => {
      void load();
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  // Auto-redirect to attempt page if session becomes active and student has joined
  useEffect(() => {
    if (data?.status === 'active' && data?.attemptId) {
      router.push(getI18nPath(`/attempt/${data.attemptId}`, locale));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, data?.attemptId]);

  const waitDuration = useMemo(() => {
    if (!data || data.status !== 'lobby') {
      return null;
    }
    return formatDuration(data.createdAt, locale);
  }, [data, locale]);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-lg font-semibold">{t('cannot_access_session')}</div>
        <div className="mt-2 text-sm text-danger">{error}</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <Link
          href={getI18nPath('/dashboard', locale)}
          className="hover:text-text-heading transition-colors"
        >
          {t('breadcrumb_dashboard')}
        </Link>
        <span>/</span>
        <Link
          href={getI18nPath(`/dashboard/classes/${data.classroom.id}`, locale)}
          className="hover:text-text-heading transition-colors"
        >
          {data.classroom.name}
        </Link>
        <span>/</span>
        <span className="text-text-muted">{t('breadcrumb_session')}</span>
      </div>

      {/* Session Info Card */}
      <Card className="p-6 border-indigo-500/30 animate-slideUp">
        <div className="mb-4">
          <div className="text-xl font-semibold text-text-heading">{data.sessionName || data.quiz.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>
              {t('class')}
              {' '}
              <span className="font-semibold text-text-body">{data.classroom.name}</span>
            </span>
            <span>·</span>
            <span>
              {t('class_code')}
              {' '}
              <span className="font-mono font-semibold text-text-body">{data.classroom.classCode}</span>
            </span>
            <span>·</span>
            <span>
              {t('teacher')}
              {' '}
              <span className="font-semibold text-text-body">{data.quiz.createdBy.name}</span>
            </span>
          </div>
        </div>
      </Card>

      {data.status === 'lobby'
        ? (
            <Card className="p-8 border-indigo-500/40 bg-indigo-500/5 animate-slideUp" style={{ animationDelay: '50ms' }}>
              <div className="flex flex-col items-center text-center">
                {data.attemptId
                  ? (
                      // Đã join, đang chờ teacher bắt đầu
                      <>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-spin text-indigo-400"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <div className="text-xl font-semibold text-text-heading mb-2">{t('joined_waiting')}</div>
                        <div className="text-sm text-text-body mb-4">
                          {t('auto_redirect_hint')}
                        </div>
                        {waitDuration
                          ? (
                              <div className="text-xs text-text-muted">
                                {t('waited')}
                                {' '}
                                <span className="font-mono font-semibold">{waitDuration}</span>
                              </div>
                            )
                          : null}
                      </>
                    )
                  : (
                      // Chưa join, cần bấm nút join
                      <>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-indigo-400"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="text-xl font-semibold text-text-heading mb-2">{t('join_session')}</div>
                        <div className="text-sm text-text-body mb-6">
                          {t('join_session_hint')}
                        </div>
                        <Button
                          variant="primary"
                          size="lg"
                          className={cn(
                            'w-full bg-indigo-500 hover:bg-indigo-600 text-lg py-4 transition-all duration-fast',
                            !busy && 'hover:scale-[1.02]',
                          )}
                          onClick={() => void join()}
                          disabled={busy}
                        >
                          {busy
                            ? (
                                <>
                                  <svg
                                    className="mr-2 h-5 w-5 animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  {t('joining')}
                                </>
                              )
                            : (
                                <>
                                  {t('join')}
                                  <svg
                                    className="ml-2 h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                                    />
                                  </svg>
                                </>
                              )}
                        </Button>
                      </>
                    )}
              </div>
            </Card>
          )
        : data.status === 'active'
          ? (
              <Card className="p-8 border-indigo-500 bg-indigo-500/10 animate-slideUp" style={{ animationDelay: '50ms' }}>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-indigo-400"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-semibold text-text-heading mb-1">{t('session_started')}</div>
                    <div className="text-base text-text-body">
                      {t('click_to_start_quiz')}
                    </div>
                    {data.startedAt
                      ? (
                          <div className="mt-2 text-xs text-text-muted">
                            {t('started_at')}
                            {' '}
                            <span className="font-mono">{new Date(data.startedAt).toLocaleTimeString('en-US')}</span>
                          </div>
                        )
                      : null}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className={cn(
                    'w-full bg-indigo-500 hover:bg-indigo-600 text-lg py-4 transition-all duration-fast',
                    !busy && 'animate-pulse hover:scale-[1.02]',
                  )}
                  onClick={() => void join()}
                  disabled={busy}
                >
                  {busy
                    ? (
                        <>
                          <svg
                            className="mr-2 h-5 w-5 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          {t('entering')}
                        </>
                      )
                    : (
                        <>
                          {t('start_quiz')}
                          <svg
                            className="ml-2 h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </>
                      )}
                </Button>
              </Card>
            )
          : (
              <Card className="p-8 border-border-subtle animate-slideUp" style={{ animationDelay: '50ms' }}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-section">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-text-muted"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="text-xl font-semibold text-text-heading mb-2">{t('session_ended')}</div>
                  <div className="text-sm text-text-muted mb-4">
                    {t('ask_teacher_for_results')}
                  </div>
                  {data.endedAt
                    ? (
                        <div className="text-xs text-text-muted">
                          {t('ended_at')}
                          {' '}
                          <span className="font-mono">{new Date(data.endedAt).toLocaleTimeString('en-US')}</span>
                        </div>
                      )
                    : null}
                  <div className="mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => router.push(getI18nPath(`/dashboard/classes/${data.classroom.id}`, locale))}
                    >
                      {t('back_to_class')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
    </div>
  );
}
// EOF
