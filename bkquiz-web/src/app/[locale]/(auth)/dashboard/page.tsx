import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getUserRole, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Dashboard',
  });

  return {
    title: t('meta_title'),
  };
}

export default async function Dashboard() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  const initial: Array<{ id: string; name: string; classCode: string }> = [];
  const rows = await prisma.classMembership.findMany({
    where: { userId, status: 'active' },
    include: { classroom: true },
    orderBy: { joinedAt: 'desc' },
  });

  for (const r of rows) {
    initial.push({
      id: r.classroom.id,
      name: r.classroom.name,
      classCode: r.classroom.classCode,
    });
  }

  // KPIs based on role
  const [quizCount, poolCount, activeSessionCount, myActiveSessionsCount, myAttemptsCount] = await Promise.all([
    // Teacher: quiz count
    role === 'teacher'
      ? prisma.quiz.count({ where: { createdByTeacherId: userId } })
      : Promise.resolve(0),
    // Teacher: pool count
    role === 'teacher'
      ? prisma.questionPool.count({ where: { ownerTeacherId: userId } })
      : Promise.resolve(0),
    // Teacher: active sessions count (sessions của teacher)
    role === 'teacher'
      ? prisma.quizSession.count({
          where: {
            status: 'active',
            quiz: { createdByTeacherId: userId },
          },
        })
      : Promise.resolve(0),
    // Student: active sessions count (sessions mà student đang tham gia)
    role === 'student'
      ? prisma.attempt.count({
          where: {
            userId,
            status: 'active',
            session: { status: 'active' },
          },
        })
      : Promise.resolve(0),
    // Student: total attempts count
    role === 'student'
      ? prisma.attempt.count({
          where: { userId },
        })
      : Promise.resolve(0),
  ]);

  const recentClasses = initial.slice(0, 5);

  return (
    <div className="space-y-7">
      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-text-muted">BKquiz Dashboard</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              Tổng quan
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              {role === 'teacher'
                ? 'Tổng quan và quick access đến các tài nguyên của bạn.'
                : 'Xem các lớp bạn tham gia và theo dõi các session đang diễn ra.'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {role === 'teacher'
              ? (
                  <>
                    <Link href="/dashboard/classes/">
                      <Button variant="primary">Quản lý Classes</Button>
                    </Link>
                    <Link href="/dashboard/quizzes/">
                      <Button variant="ghost">Quản lý Quizzes</Button>
                    </Link>
                    <Link href="/dashboard/question-bank/">
                      <Button variant="ghost">Question Bank</Button>
                    </Link>
                  </>
                )
              : (
                  <Link href="/dashboard/sessions">
                    <Button variant="primary">Xem các session của bạn</Button>
                  </Link>
                )}
            {process.env.DEV_BYPASS_AUTH === '1'
              ? (
                  <Link href="/dev/role/">
                    <Button variant="ghost">DEV: đổi role</Button>
                  </Link>
                )
              : null}
          </div>
        </div>

        {role === 'teacher'
          ? (
              <Card className="mt-5 border-dashed px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Getting started
                </div>
                <ol className="mt-2 space-y-1 text-xs text-text-body">
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
              </Card>
            )
          : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/classes">
          <Card interactive className="p-6 cursor-pointer">
            <div className="text-sm text-text-muted">Classes</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{initial.length}</div>
              <Badge variant="neutral">active</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {role === 'teacher'
                ? 'Số lớp bạn đang quản lý.'
                : 'Số lớp bạn đang tham gia (active membership).'}
            </div>
          </Card>
        </Link>

        {role === 'teacher'
          ? (
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
            )
          : (
              <Link href="/dashboard/sessions">
                <Card interactive className="p-6 cursor-pointer">
                  <div className="text-sm text-text-muted">My Active Sessions</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="text-3xl font-semibold text-text-heading">{myActiveSessionsCount}</div>
                    <Badge variant={myActiveSessionsCount > 0 ? 'success' : 'neutral'}>
                      {myActiveSessionsCount > 0 ? 'active' : 'none'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Sessions bạn đang tham gia.
                  </div>
                </Card>
              </Link>
            )}

        {role === 'teacher'
          ? (
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
            )
          : (
              <Link href="/dashboard/sessions">
                <Card interactive className="p-6 cursor-pointer">
                  <div className="text-sm text-text-muted">My Attempts</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="text-3xl font-semibold text-text-heading">{myAttemptsCount}</div>
                    <Badge variant="info">total</Badge>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Tổng số bài bạn đã làm.
                  </div>
                </Card>
              </Link>
            )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">Recent Classes</div>
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
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                    <div className="text-sm text-text-muted">
                      Chưa có lớp nào.
                    </div>
                    <div className="mt-2">
                      <Link href="/dashboard/classes">
                        <Button variant="primary" size="sm">
                          Tạo hoặc join lớp
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

        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading">Quick Access</div>
          <div className="mt-1 text-sm text-text-muted">Truy cập nhanh.</div>

          <div className="mt-4 grid gap-3">
            <Link href="/dashboard/classes">
              <Card interactive className="p-3 text-sm cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-text-heading">Classes</div>
                  <Badge variant="info">{initial.length}</Badge>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {role === 'teacher' ? 'Quản lý lớp học của bạn.' : 'Các lớp bạn đang tham gia.'}
                </div>
              </Card>
            </Link>

            {role === 'teacher'
              ? (
                  <Link href="/dashboard/question-bank">
                    <Card interactive className="p-3 text-sm cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-text-heading">Question pools</div>
                        <Badge variant="info">{poolCount}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        Pools bạn sở hữu (teacher).
                      </div>
                    </Card>
                  </Link>
                )
              : (
                  <Link href="/dashboard/sessions">
                    <Card interactive className="p-3 text-sm cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-text-heading">My Sessions</div>
                        <Badge variant="info">{myActiveSessionsCount}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        Sessions bạn đang tham gia.
                      </div>
                    </Card>
                  </Link>
                )}
          </div>
        </Card>
      </div>
    </div>
  );
}
