import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/server/prisma';

type StudentDashboardProps = {
  userId: string;
  classes: Array<{ id: string; name: string; classCode: string }>;
  myActiveSessionsCount: number;
  myAttemptsCount: number;
  locale: string;
};

export async function StudentDashboard(props: StudentDashboardProps) {
  const { userId, classes, myActiveSessionsCount, myAttemptsCount, locale } = props;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Dashboard.student',
  });

  // Fetch active sessions (priority display)
  const activeSessions = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'active',
      quizSession: { status: 'active' },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      quizSession: {
        select: {
          id: true,
          startedAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  // Fetch upcoming sessions (lobby status)
  const upcomingSessions = await prisma.attempt.findMany({
    where: {
      userId,
      quizSession: { status: 'lobby' },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      quizSession: {
        select: {
          id: true,
          createdAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  // Fetch performance summary
  const performanceData = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'submitted',
      score: { not: null },
    },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: {
      score: true,
    },
  });

  const scores = performanceData.map(a => a.score!).filter((s): s is number => s !== null);
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;
  const highestScore = scores.length > 0
    ? Math.max(...scores)
    : null;

  const recentClasses = classes.slice(0, 3);

  function formatDate(date: Date | null) {
    if (!date) {
      return '—';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Header */}
      <Card className="p-6 border-indigo-500/30 animate-slideUp">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-indigo-400 uppercase tracking-wide">{t('header_subtitle')}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              {t('header_title')}
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              {t('header_description')}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/sessions">
              <Button variant="primary" className="bg-indigo-500 hover:bg-indigo-600 hover:scale-105">
                {t('view_my_sessions')}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 animate-slideUp" style={{ animationDelay: '50ms' }}>
        <Link href="/dashboard/classes">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-indigo-500/40">
            <div className="text-sm text-text-muted">{t('classes_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{classes.length}</div>
              <Badge variant="neutral">active</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('classes_description')}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-indigo-500/40">
            <div className="text-sm text-text-muted">{t('my_active_sessions_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{myActiveSessionsCount}</div>
              <Badge variant={myActiveSessionsCount > 0 ? 'success' : 'neutral'}>
                {myActiveSessionsCount > 0 ? 'active' : 'none'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('my_active_sessions_description')}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-indigo-500/40">
            <div className="text-sm text-text-muted">{t('my_attempts_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{myAttemptsCount}</div>
              <Badge variant="info">total</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('my_attempts_description')}
            </div>
          </Card>
        </Link>
      </div>

      {/* Active Sessions Priority */}
      {activeSessions.length > 0 && (
        <Card className="p-6 border-indigo-500/30 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">
            {t('active_sessions_title', { count: activeSessions.length })}
          </div>
          <div className="space-y-3">
            {activeSessions.map((attempt, idx) => (
              <Link key={attempt.id} href={`/attempt/${attempt.id}`}>
                <Card
                  interactive
                  className="p-5 cursor-pointer border-indigo-500/50 bg-indigo-500/5 transition-all duration-200 hover:bg-indigo-500/10 hover:border-indigo-500/70 hover:scale-[1.02] hover:shadow-lg"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-text-heading">
                        {attempt.quizSession.quiz.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {t('started_at')}
                        {' '}
                        {formatDate(attempt.quizSession.startedAt)}
                      </div>
                    </div>
                    <Button variant="primary" size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                      {t('continue')}
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3 animate-slideUp" style={{ animationDelay: '150ms' }}>
        {/* My Classes */}
        <Card className="p-6 lg:col-span-2 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">{t('my_classes_title')}</div>
              <div className="mt-1 text-sm text-text-muted">
                {t('my_classes_description')}
              </div>
            </div>
            <Link href="/dashboard/classes">
              <Button variant="ghost" size="sm">
                {t('view_all')}
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            {recentClasses.length === 0
              ? (
                  <div className="rounded-md border border-dashed border-indigo-500/30 px-4 py-8 text-center">
                    <div className="text-sm text-text-muted">
                      {t('no_classes_yet')}
                    </div>
                    <div className="mt-2">
                      <Link href="/dashboard/classes">
                        <Button variant="primary" size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                          {t('join_class')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              : (
                  <div className="space-y-3">
                    {recentClasses.map((c, idx) => (
                      <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
                        <div
                          className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-text-heading">{c.name}</div>
                            <div className="mt-1 text-xs text-text-muted">
                              <span className="font-mono">{c.classCode}</span>
                            </div>
                          </div>
                          <span className="text-xs text-text-muted">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
          </div>
        </Card>

        {/* Performance Summary */}
        <Card className="p-6 border-indigo-500/30">
          <div className="text-lg font-semibold text-text-heading mb-4">{t('performance_title')}</div>
          {averageScore !== null
            ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-text-muted">{t('average_score')}</div>
                    <div className="mt-1 text-3xl font-semibold text-indigo-400">
                      {averageScore.toFixed(1)}
                    </div>
                  </div>
                  {highestScore !== null && (
                    <div>
                      <div className="text-xs text-text-muted">{t('highest_score')}</div>
                      <div className="mt-1 text-2xl font-semibold text-indigo-400">
                        {highestScore.toFixed(1)}
                      </div>
                    </div>
                  )}
                  <Link href="/dashboard/performance">
                    <Button variant="ghost" size="sm" className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                      {t('view_details')}
                    </Button>
                  </Link>
                </div>
              )
            : (
                <div className="text-center py-6 text-sm text-text-muted">
                  {t('no_scores_yet')}
                  <div className="mt-2">
                    <Link href="/dashboard/sessions">
                      <Button variant="ghost" size="sm" className="border-indigo-500/30 text-indigo-400">
                        {t('take_quiz_now')}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
        </Card>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="p-6 border-indigo-500/20 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">
            {t('upcoming_sessions_title', { count: upcomingSessions.length })}
          </div>
          <div className="space-y-3">
            {upcomingSessions.map((attempt, idx) => (
              <Link key={attempt.id} href={`/session/${attempt.quizSession.id}`}>
                <div
                  className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-heading">
                      {attempt.quizSession.quiz.title}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {t('created_at')}
                      {' '}
                      {formatDate(attempt.quizSession.createdAt)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="border-indigo-500/30 text-indigo-400">
                    {t('view_lobby')}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Getting Started (Collapsible) */}
      <Card className="p-5 border-dashed border-indigo-500/30 animate-slideUp transition-all duration-300" style={{ animationDelay: '250ms' }}>
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-indigo-400 list-none transition-colors hover:text-indigo-300">
            <div className="flex items-center justify-between">
              <span>{t('getting_started')}</span>
              <span className="text-indigo-400 group-open:rotate-180 transition-transform duration-200">▼</span>
            </div>
          </summary>
          <ol className="mt-3 space-y-1 text-xs text-text-body animate-fadeIn">
            <li>
              <span className="font-mono text-text-muted">1.</span>
              {' '}
              {t('getting_started_step1')}{' '}
              <span className="font-mono">{t('class_code')}</span>
              {' '}
              in{' '}
              <Link href="/dashboard/classes" className="text-indigo-400 hover:underline">
                Classes
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">2.</span>
              {' '}
              {t('getting_started_step2')}{' '}
              <span className="font-medium">{t('ongoing_sessions')}</span>
              {' '}
              in{' '}
              <Link href="/dashboard/sessions" className="text-indigo-400 hover:underline">
                My Sessions
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">3.</span>
              {' '}
              {t('getting_started_step3')}
            </li>
            <li>
              <span className="font-mono text-text-muted">4.</span>
              {' '}
              {t('getting_started_step4')}
            </li>
          </ol>
        </details>
      </Card>
    </div>
  );
}
