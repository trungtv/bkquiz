import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { ClassroomPanel } from './ClassroomPanel';

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

  // Xác định system role: ưu tiên devRole (DEV_BYPASS_AUTH), fallback vào UserRole trong DB
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });
  const hasTeacherRole = devRole === 'teacher' || userRoles.some(r => r.role === 'teacher');
  const role: 'teacher' | 'student' = hasTeacherRole ? 'teacher' : 'student';

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

  const classroomIds = rows.map(r => r.classroomId);

  // Quiz count: đếm quiz của teacher (quiz không còn gắn với classroom)
  const [quizCount, poolCount, activeSessionCount] = await Promise.all([
    role === 'teacher'
      ? prisma.quiz.count({ where: { createdByTeacherId: userId } })
      : Promise.resolve(0),
    prisma.questionPool.count({ where: { ownerTeacherId: userId } }),
    // Active sessions: đếm tất cả active sessions của quiz mà teacher sở hữu
    // (không filter theo classroom vì session không có classroomId trực tiếp)
    role === 'teacher'
      ? prisma.quizSession.count({
          where: {
            status: 'active',
            quiz: { createdByTeacherId: userId },
          },
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
                ? 'Quản lý lớp, quiz, session, và question pools.'
                : 'Xem các lớp bạn tham gia và theo dõi các session đang diễn ra.'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {role === 'teacher'
              ? (
                  <>
                    <Link href="/dashboard/quizzes/">
                      <Button variant="primary">Tạo / quản lý Quiz</Button>
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
                    Tạo lớp đầu tiên của bạn trong mục
                    {' '}
                    <span className="font-medium">Lớp học &amp; Sessions</span>
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
              Số lớp bạn đang tham gia (active membership).
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/quizzes">
          <Card interactive className="p-6 cursor-pointer">
            <div className="text-sm text-text-muted">Quizzes</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-text-heading">{quizCount}</div>
              <Badge variant="info">in your classes</Badge>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Tổng quiz thuộc các lớp bạn tham gia.
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
              Sessions đang chạy (status=active) trong các lớp của bạn.
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-text-heading">Lớp học &amp; Sessions</div>
              <div className="mt-1 text-sm text-text-muted">
                {role === 'teacher'
                  ? 'Tạo/join lớp, tạo session, chọn quiz để chạy.'
                  : 'Join lớp bằng class code và xem danh sách lớp của bạn.'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <ClassroomPanel initial={initial} role={role} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading">Quick view</div>
          <div className="mt-1 text-sm text-text-muted">Một vài thông tin nhanh.</div>

          <div className="mt-4 grid gap-3">
            <Link href="/dashboard/question-bank">
              <Card interactive className="p-3 text-sm cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-text-heading">Question pools (owned)</div>
                  <Badge variant="info">{poolCount}</Badge>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  Pools bạn sở hữu (teacher).
                </div>
              </Card>
            </Link>

            <Card className="p-3 text-sm">
              <div className="font-medium text-text-heading">Recent classes</div>
              <div className="mt-2 grid gap-1">
                {recentClasses.length === 0
                  ? (
                      <div className="text-xs text-text-muted">
                        Chưa có lớp nào. Hãy tạo hoặc join bằng class code.
                      </div>
                    )
                  : recentClasses.map(c => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="truncate text-text-body">{c.name}</div>
                        <span className="font-mono text-text-muted">{c.classCode}</span>
                      </div>
                    ))}
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
