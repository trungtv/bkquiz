import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';

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
    include: { Classroom: true },
    orderBy: { joinedAt: 'desc' },
  });

  for (const r of rows) {
    initial.push({
      id: r.Classroom.id,
      name: r.Classroom.name,
      classCode: r.Classroom.classCode,
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
            Quiz: { createdByTeacherId: userId },
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

  if (role === 'teacher') {
    return (
      <TeacherDashboard
        userId={userId}
        classes={initial}
        quizCount={quizCount}
        poolCount={poolCount}
        activeSessionCount={activeSessionCount}
      />
    );
  }

  return (
    <StudentDashboard
      userId={userId}
      classes={initial}
      myActiveSessionsCount={myActiveSessionsCount}
      myAttemptsCount={myAttemptsCount}
    />
  );
}
