import Link from 'next/link';
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
};

export async function TeacherDashboard(props: TeacherDashboardProps) {
  const { userId, classes, quizCount, poolCount, activeSessionCount } = props;

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
    <div className="space-y-7">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-text-muted">BKquiz Dashboard</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              Tổng quan
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              Tổng quan và quick access đến các tài nguyên của bạn.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/classes/">
              <Button variant="primary">Quản lý Classes</Button>
            </Link>
            <Link href="/dashboard/quizzes/">
              <Button variant="ghost">Quản lý Quizzes</Button>
            </Link>
            <Link href="/dashboard/question-bank/">
              <Button variant="ghost">Question Bank</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Quick Actions Bar */}
      <Card className="p-5 md:p-6 bg-bg-card/50">
        <div className="text-sm font-semibold text-text-heading mb-3">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/classes">
            <Button variant="primary" size="sm">
              + Tạo Class
            </Button>
          </Link>
          <Link href="/dashboard/quizzes">
            <Button variant="primary" size="sm">
              + Tạo Quiz
            </Button>
          </Link>
          <Link href="/dashboard/question-bank">
            <Button variant="ghost" size="sm">
              + Import Pool
            </Button>
          </Link>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/classes">
          <Card interactive className="p-6 cursor-pointer">
            <div className="text-sm text-text-muted">Classes</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{classes.length}</div>
              <Badge variant="neutral">active</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Số lớp bạn đang quản lý.
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/quizzes">
          <Card interactive className="p-6 cursor-pointer">
            <div className="text-sm text-text-muted">Quizzes</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{quizCount}</div>
              <Badge variant="info">total</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Tổng quiz bạn đã tạo.
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer">
            <div className="text-sm text-text-muted">Active sessions</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{activeSessionCount}</div>
              <Badge variant={activeSessionCount > 0 ? 'success' : 'neutral'}>
                {activeSessionCount > 0 ? 'running' : 'idle'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Sessions đang chạy (status=active).
            </div>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Classes */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">Recent Classes</div>
              <div className="mt-1 text-sm text-text-muted">
                Các lớp bạn đang quản lý. Click để xem chi tiết.
              </div>
            </div>
            <Link href="/dashboard/classes">
              <Button variant="ghost" size="sm">
                Xem tất cả
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            {recentClasses.length === 0
              ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                    <div className="text-sm text-text-muted">
                      Chưa có lớp nào.
                    </div>
                    <div className="mt-2">
                      <Link href="/dashboard/classes">
                        <Button variant="primary" size="sm">
                          Tạo lớp đầu tiên
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              : (
                  <div className="space-y-2">
                    {recentClasses.map(c => (
                      <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
                        <div className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-border-strong">
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
          <div className="text-lg font-semibold text-text-heading mb-4">Active Sessions</div>
          {activeSessions.length === 0
            ? (
                <div className="text-center py-6 text-sm text-text-muted">
                  Không có session nào đang chạy.
                </div>
              )
            : (
                <div className="space-y-3">
                  {activeSessions.map(session => (
                    <Link key={session.id} href={`/dashboard/sessions/${session.id}/teacher`}>
                      <div className="rounded-md border border-border-subtle bg-bg-section px-3 py-2.5 transition-colors hover:border-primary/50">
                        <div className="text-sm font-medium text-text-heading truncate">
                          {session.quiz.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                          <span>
                            {session._count.attempts}
                            {' '}
                            students
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
                        Xem tất cả ({activeSessionCount})
                      </Button>
                    </Link>
                  )}
                </div>
              )}
        </Card>
      </div>

      {/* Quiz Status Overview */}
      {(draftQuizzes > 0 || publishedQuizzes > 0 || quizzesWithoutRules > 0) && (
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">Quiz Status</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border-subtle bg-bg-section px-4 py-3">
              <div className="text-xs text-text-muted">Draft</div>
              <div className="mt-1 text-2xl font-semibold text-text-heading">{draftQuizzes}</div>
            </div>
            <div className="rounded-md border border-border-subtle bg-bg-section px-4 py-3">
              <div className="text-xs text-text-muted">Published</div>
              <div className="mt-1 text-2xl font-semibold text-text-heading">{publishedQuizzes}</div>
            </div>
            {quizzesWithoutRules > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
                <div className="text-xs text-warning">Chưa có rules</div>
                <div className="mt-1 text-2xl font-semibold text-warning">{quizzesWithoutRules}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Getting Started (Collapsible) */}
      <Card className="p-5 border-dashed">
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-text-muted list-none">
            <div className="flex items-center justify-between">
              <span>Getting started</span>
              <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
            </div>
          </summary>
          <ol className="mt-3 space-y-1 text-xs text-text-body">
            <li>
              <span className="font-mono text-text-muted">1.</span>
              {' '}
              Tạo lớp đầu tiên của bạn trong
              {' '}
              <Link href="/dashboard/classes" className="text-primary hover:underline">
                Classes
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">2.</span>
              {' '}
              Import hoặc tạo
              {' '}
              <span className="font-medium">question pool</span>
              {' '}
              trong
              {' '}
              <Link href="/dashboard/question-bank" className="text-primary hover:underline">
                Question Bank
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">3.</span>
              {' '}
              Tạo
              {' '}
              <span className="font-medium">quiz</span>
              {' '}
              cho từng lớp và cấu hình
              {' '}
              <span className="font-mono">rules</span>
              {' '}
              theo tag/pool.
            </li>
            <li>
              <span className="font-mono text-text-muted">4.</span>
              {' '}
              Vào
              {' '}
              <Link href="/dashboard/sessions" className="text-primary hover:underline">
                Sessions
              </Link>
              {' '}
              để
              {' '}
              <span className="font-medium">start session</span>
              {' '}
              và chiếu
              {' '}
              <span className="font-mono">Teacher Screen</span>
              {' '}
              cho sinh viên.
            </li>
          </ol>
        </details>
      </Card>
    </div>
  );
}

