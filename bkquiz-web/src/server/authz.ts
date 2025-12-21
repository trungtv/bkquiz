import { nanoid } from 'nanoid';
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
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, updatedAt: now },
    create: {
      id: nanoid(),
      email,
      name,
      updatedAt: now,
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

/**
 * Get user's system role (teacher or student)
 * Supports DEV_BYPASS_AUTH mode
 */
export async function getUserRole(
  userId: string,
  devRole?: 'teacher' | 'student',
): Promise<'teacher' | 'student'> {
  if (devRole) {
    return devRole;
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });

  return userRoles.some(r => r.role === 'teacher') ? 'teacher' : 'student';
}

/**
 * Require user to have teacher system role
 * Throws error if user is not a teacher
 */
export async function requireTeacher(userId: string, devRole?: 'teacher' | 'student') {
  const role = await getUserRole(userId, devRole);
  if (role !== 'teacher') {
    throw new Error('FORBIDDEN: Teacher role required');
  }
}

/**
 * Require user to have student system role
 * Throws error if user is not a student
 */
export async function requireStudent(userId: string, devRole?: 'teacher' | 'student') {
  const role = await getUserRole(userId, devRole);
  if (role !== 'student') {
    throw new Error('FORBIDDEN: Student role required');
  }
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
