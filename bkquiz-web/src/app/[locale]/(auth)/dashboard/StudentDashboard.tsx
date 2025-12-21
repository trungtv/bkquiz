import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/server/prisma';

type StudentDashboardProps = {
  userId: string;
  classes: Array<{ id: string; name: string; classCode: string }>;
  myActiveSessionsCount: number;
  myAttemptsCount: number;
};

export async function StudentDashboard(props: StudentDashboardProps) {
  const { userId, classes, myActiveSessionsCount, myAttemptsCount } = props;

  // Fetch active sessions (priority display)
  const activeSessions = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'active',
      session: { status: 'active' },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      session: {
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
      session: { status: 'lobby' },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      session: {
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
  const highestScore = scores.length > 0 ? Math.max(...scores) : null;

  const recentClasses = classes.slice(0, 3);

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
      <Card className="p-6 border-indigo-500/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-indigo-400 uppercase tracking-wide">BKquiz Dashboard</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              Tổng quan
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              Xem các lớp bạn tham gia và theo dõi các session đang diễn ra.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/sessions">
              <Button variant="primary" className="bg-indigo-500 hover:bg-indigo-600">
                Xem các session của bạn
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/classes">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20">
            <div className="text-sm text-text-muted">Classes</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{classes.length}</div>
              <Badge variant="neutral">active</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Số lớp bạn đang tham gia.
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20">
            <div className="text-sm text-text-muted">My Active Sessions</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{myActiveSessionsCount}</div>
              <Badge variant={myActiveSessionsCount > 0 ? 'success' : 'neutral'}>
                {myActiveSessionsCount > 0 ? 'active' : 'none'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Sessions bạn đang tham gia.
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card interactive className="p-6 cursor-pointer border-indigo-500/20">
            <div className="text-sm text-text-muted">My Attempts</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-indigo-400">{myAttemptsCount}</div>
              <Badge variant="info">total</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Tổng số bài bạn đã làm.
            </div>
          </Card>
        </Link>
      </div>

      {/* Active Sessions Priority */}
      {activeSessions.length > 0 && (
        <Card className="p-6 border-indigo-500/30">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Đang làm bài ({activeSessions.length})
          </div>
          <div className="space-y-3">
            {activeSessions.map(attempt => (
              <Link key={attempt.id} href={`/attempt/${attempt.id}`}>
                <Card interactive className="p-5 cursor-pointer border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-text-heading">
                        {attempt.session.quiz.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        Bắt đầu: {formatDate(attempt.session.startedAt)}
                      </div>
                    </div>
                    <Button variant="primary" size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                      Tiếp tục →
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* My Classes */}
        <Card className="p-6 lg:col-span-2 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">My Classes</div>
              <div className="mt-1 text-sm text-text-muted">
                Các lớp bạn đang tham gia. Click để xem chi tiết.
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
                  <div className="rounded-md border border-dashed border-indigo-500/30 px-4 py-8 text-center">
                    <div className="text-sm text-text-muted">
                      Chưa có lớp nào.
                    </div>
                    <div className="mt-2">
                      <Link href="/dashboard/classes">
                        <Button variant="primary" size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                          Join lớp
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              : (
                  <div className="space-y-2">
                    {recentClasses.map(c => (
                      <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
                        <div className="flex items-center justify-between gap-4 rounded-md border border-indigo-500/30 bg-bg-section px-4 py-3 transition-colors hover:border-indigo-500/50">
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
          <div className="text-lg font-semibold text-text-heading mb-4">Performance</div>
          {averageScore !== null
            ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-text-muted">Điểm trung bình</div>
                    <div className="mt-1 text-3xl font-semibold text-indigo-400">
                      {averageScore.toFixed(1)}
                    </div>
                  </div>
                  {highestScore !== null && (
                    <div>
                      <div className="text-xs text-text-muted">Điểm cao nhất</div>
                      <div className="mt-1 text-2xl font-semibold text-indigo-400">
                        {highestScore.toFixed(1)}
                      </div>
                    </div>
                  )}
                  <Link href="/dashboard/performance">
                    <Button variant="ghost" size="sm" className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                      Xem chi tiết →
                    </Button>
                  </Link>
                </div>
              )
            : (
                <div className="text-center py-6 text-sm text-text-muted">
                  Chưa có điểm số.
                  <div className="mt-2">
                    <Link href="/dashboard/sessions">
                      <Button variant="ghost" size="sm" className="border-indigo-500/30 text-indigo-400">
                        Làm bài ngay
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
        </Card>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="p-6 border-indigo-500/20">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Chờ bắt đầu ({upcomingSessions.length})
          </div>
          <div className="space-y-2">
            {upcomingSessions.map(attempt => (
              <Link key={attempt.id} href={`/session/${attempt.session.id}`}>
                <div className="flex items-center justify-between gap-4 rounded-md border border-indigo-500/30 bg-bg-section px-4 py-3 transition-colors hover:border-indigo-500/50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-heading">
                      {attempt.session.quiz.title}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      Tạo lúc: {formatDate(attempt.session.createdAt)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="border-indigo-500/30 text-indigo-400">
                    Xem lobby
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Getting Started (Collapsible) */}
      <Card className="p-5 border-dashed border-indigo-500/30">
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-indigo-400 list-none">
            <div className="flex items-center justify-between">
              <span>Getting started</span>
              <span className="text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
            </div>
          </summary>
          <ol className="mt-3 space-y-1 text-xs text-text-body">
            <li>
              <span className="font-mono text-text-muted">1.</span>
              {' '}
              Tham gia lớp học bằng
              {' '}
              <span className="font-mono">class code</span>
              {' '}
              trong
              {' '}
              <Link href="/dashboard/classes" className="text-indigo-400 hover:underline">
                Classes
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">2.</span>
              {' '}
              Xem các
              {' '}
              <span className="font-medium">session đang diễn ra</span>
              {' '}
              trong
              {' '}
              <Link href="/dashboard/sessions" className="text-indigo-400 hover:underline">
                My Sessions
              </Link>
              .
            </li>
            <li>
              <span className="font-mono text-text-muted">3.</span>
              {' '}
              Join session và làm bài quiz theo hướng dẫn của giáo viên.
            </li>
            <li>
              <span className="font-mono text-text-muted">4.</span>
              {' '}
              Xem kết quả và điểm số sau khi nộp bài.
            </li>
          </ol>
        </details>
      </Card>
    </div>
  );
}

