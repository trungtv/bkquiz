import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/server/prisma';

type TeacherDashboardProps = {
  userId: string;
  classes: Array<{ id: string; name: string; classCode: string }>;
  quizCount: number;
  poolCount: number;
  activeSessionCount: number;
  locale: string;
};

export async function TeacherDashboard(props: TeacherDashboardProps) {
  const { userId, classes, quizCount, activeSessionCount, locale } = props;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Dashboard.teacher',
  });
  const tClasses = await getTranslations({ locale, namespace: 'Classes' });
  const tQuestionBank = await getTranslations({ locale, namespace: 'QuestionBank' });
  const tSessions = await getTranslations({ locale, namespace: 'Sessions' });

  // Fetch active sessions for widget
  const activeSessions = await prisma.quizSession.findMany({
    where: {
      status: 'active',
      quiz: { createdByTeacherId: userId },
    },
    orderBy: { startedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      startedAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  // Fetch quiz status overview
  const [draftQuizzes, publishedQuizzes, quizzesWithoutRules] = await Promise.all([
    prisma.quiz.count({
      where: {
        createdByTeacherId: userId,
        status: 'draft',
      },
    }),
    prisma.quiz.count({
      where: {
        createdByTeacherId: userId,
        status: 'published',
      },
    }),
    prisma.quiz.count({
      where: {
        createdByTeacherId: userId,
        rules: { none: {} },
      },
    }),
  ]);

  const recentClasses = classes.slice(0, 5);

  function formatDate(date: Date | null) {
    if (!date) return '—';
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
      <Card className="p-6 animate-slideUp">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-text-muted">{t('header_subtitle')}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              {t('header_title')}
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              {t('header_description')}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/classes/">
              <Button variant="primary">{t('manage_classes')}</Button>
            </Link>
            <Link href="/dashboard/quizzes/">
              <Button variant="ghost">{t('manage_quizzes')}</Button>
            </Link>
            <Link href="/dashboard/question-bank/">
              <Button variant="ghost">{t('question_bank')}</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Quick Actions Bar */}
      <Card className="p-5 md:p-6 bg-bg-card/50 animate-slideUp" style={{ animationDelay: '50ms' }}>
        <div className="text-sm font-semibold text-text-heading mb-3">{t('quick_actions')}</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/classes">
            <Button variant="primary" size="sm" className="hover:scale-105">
              {t('create_class')}
            </Button>
          </Link>
          <Link href="/dashboard/quizzes">
            <Button variant="primary" size="sm" className="hover:scale-105">
              {t('create_quiz')}
            </Button>
          </Link>
          <Link href="/dashboard/question-bank">
            <Button variant="ghost" size="sm" className="hover:scale-105">
              {t('import_pool')}
            </Button>
          </Link>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <Link href="/dashboard/classes">
          <Card interactive className="p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="text-sm text-text-muted">{t('classes_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{classes.length}</div>
              <Badge variant="neutral">active</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('classes_description')}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/quizzes">
          <Card interactive className="p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="text-sm text-text-muted">{t('quizzes_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{quizCount}</div>
              <Badge variant="info">total</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('quizzes_description')}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="text-sm text-text-muted">{t('active_sessions_label')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{activeSessionCount}</div>
              <Badge variant={activeSessionCount > 0 ? 'success' : 'neutral'}>
                {activeSessionCount > 0 ? 'running' : 'idle'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('active_sessions_description')}
            </div>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3 animate-slideUp" style={{ animationDelay: '150ms' }}>
        {/* Recent Classes */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">{t('recent_classes_title')}</div>
              <div className="mt-1 text-sm text-text-muted">
                {t('recent_classes_description')}
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
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                    <div className="text-sm text-text-muted">
                      {t('no_classes_yet')}
                    </div>
                    <div className="mt-2">
                      <Link href="/dashboard/classes">
                        <Button variant="primary" size="sm">
                          {t('create_first_class')}
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

        {/* Active Sessions Widget */}
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">{t('active_sessions_widget_title')}</div>
          {activeSessions.length === 0
            ? (
                <div className="text-center py-6 text-sm text-text-muted">
                  {t('no_sessions_running')}
                </div>
              )
            : (
                <div className="space-y-3">
                  {activeSessions.map((session, idx) => (
                    <Link key={session.id} href={`/dashboard/sessions/${session.id}/teacher`}>
                      <div
                        className="rounded-md border border-border-subtle bg-bg-section px-3 py-2.5 transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30 hover:bg-primary/5"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="text-sm font-medium text-text-heading truncate">
                          {session.quiz.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                          <span>
                            {session._count.attempts}
                            {' '}
                            {t('students')}
                          </span>
                          <span>
                            {formatDate(session.startedAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {activeSessionCount > activeSessions.length && (
                    <Link href="/dashboard/sessions">
                      <Button variant="ghost" size="sm" className="w-full">
                        {t('view_all_sessions', { count: activeSessionCount })}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
        </Card>
      </div>

      {/* Quiz Status Overview */}
      {(draftQuizzes > 0 || publishedQuizzes > 0 || quizzesWithoutRules > 0) && (
        <Card className="p-6 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="text-lg font-semibold text-text-heading mb-4">{t('quiz_status_title')}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border-subtle bg-bg-section px-4 py-3">
              <div className="text-xs text-text-muted">{t('draft')}</div>
              <div className="mt-1 text-2xl font-semibold text-text-heading">{draftQuizzes}</div>
            </div>
            <div className="rounded-md border border-border-subtle bg-bg-section px-4 py-3">
              <div className="text-xs text-text-muted">{t('published')}</div>
              <div className="mt-1 text-2xl font-semibold text-text-heading">{publishedQuizzes}</div>
            </div>
            {quizzesWithoutRules > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
                <div className="text-xs text-warning">{t('no_rules')}</div>
                <div className="mt-1 text-2xl font-semibold text-warning">{quizzesWithoutRules}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Getting Started (Collapsible) */}
      <Card className="p-5 border-dashed animate-slideUp transition-all duration-300" style={{ animationDelay: '250ms' }}>
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-text-muted list-none transition-colors hover:text-text-heading">
            <div className="flex items-center justify-between">
              <span>{t('getting_started')}</span>
              <span className="text-text-muted group-open:rotate-180 transition-transform duration-200">▼</span>
            </div>
          </summary>
          <ol className="mt-3 space-y-1 text-xs text-text-body animate-fadeIn">
            <li>
              <span className="font-mono text-text-muted">1.</span>
              {' '}
              {t('getting_started_step1')}{' '}
              <Link href="/dashboard/classes" className="text-primary hover:underline">
                {tClasses('my_classes')}
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">2.</span>
              {' '}
              {t('getting_started_step2')}{' '}
              <span className="font-medium">{t('question_pool')}</span>
              {' '}
              in{' '}
              <Link href="/dashboard/question-bank" className="text-primary hover:underline">
                {tQuestionBank('title')}
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">3.</span>
              {' '}
              {t('getting_started_step3')}{' '}
              <span className="font-medium">{t('quiz')}</span>
              {' '}
              {t('for_each_class_and_configure')}{' '}
              <span className="font-mono">{t('rules')}</span>
              {' '}
              {t('by_tag_pool')}
            </li>
            <li>
              <span className="font-mono text-text-muted">4.</span>
              {' '}
              {t('getting_started_step4')}{' '}
              <Link href="/dashboard/sessions" className="text-primary hover:underline">
                {tSessions('title')}
              </Link>
              {' '}
              {t('to')}{' '}
              <span className="font-medium">{t('start_session')}</span>
              {' '}
              {t('and_display')}{' '}
              <span className="font-mono">{t('Teacher_Screen')}</span>
              {' '}
              {t('for_students')}
            </li>
          </ol>
        </details>
      </Card>
    </div>
  );
}

