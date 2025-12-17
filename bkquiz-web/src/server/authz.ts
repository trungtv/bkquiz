import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/server/prisma';

async function getDevRoleFromCookies() {
  const c = await cookies();
  const v = c.get('bkquiz_dev_role')?.value;
  return v === 'student' ? 'student' : 'teacher';
}

async function getOrCreateDevUserId(role: 'teacher' | 'student') {
  const email = role === 'teacher' ? 'dev.teacher@bkquiz.local' : 'dev.student@bkquiz.local';
  const name = role === 'teacher' ? 'Dev Teacher' : 'Dev Student';
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      roles: { create: [{ role }] },
    },
    select: { id: true },
  });
  // Ensure role row exists (in case user existed without roles)
  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role } },
    update: {},
    create: { userId: user.id, role },
    select: { userId: true },
  }).catch(() => null);
  return user.id;
}

export async function requireUser() {
  if (process.env.DEV_BYPASS_AUTH === '1') {
    const role = await getDevRoleFromCookies();
    const userId = await getOrCreateDevUserId(role);
    return { session: null as any, userId, devRole: role };
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('UNAUTHENTICATED');
  }
  return { session, userId };
}

export async function requireTeacherInClassroom(userId: string, classroomId: string) {
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active') {
    throw new Error('CLASSROOM_FORBIDDEN');
  }
  if (membership.roleInClass !== 'teacher' && membership.roleInClass !== 'ta') {
    throw new Error('CLASSROOM_FORBIDDEN');
  }
  return membership;
}
