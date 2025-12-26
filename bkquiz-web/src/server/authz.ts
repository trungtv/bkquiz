import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/server/prisma';

/**
 * Custom error class for authorization errors
 * Provides consistent error handling across the application
 */
export class AuthorizationError extends Error {
  constructor(
    public code: string,
    public statusCode: number = 403,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthorizationError';
  }
}

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
 * Throws AuthorizationError if user is not a teacher
 */
export async function requireTeacher(userId: string, devRole?: 'teacher' | 'student') {
  const role = await getUserRole(userId, devRole);
  if (role !== 'teacher') {
    throw new AuthorizationError('FORBIDDEN', 403, 'Teacher role required');
  }
}

/**
 * Require user to have student system role
 * Throws AuthorizationError if user is not a student
 */
export async function requireStudent(userId: string, devRole?: 'teacher' | 'student') {
  const role = await getUserRole(userId, devRole);
  if (role !== 'student') {
    throw new AuthorizationError('FORBIDDEN', 403, 'Student role required');
  }
}

export async function requireTeacherInClassroom(userId: string, classroomId: string) {
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active') {
    throw new AuthorizationError('CLASSROOM_FORBIDDEN', 403, 'Classroom access denied');
  }
  if (membership.roleInClass !== 'teacher' && membership.roleInClass !== 'ta') {
    throw new AuthorizationError('CLASSROOM_FORBIDDEN', 403, 'Teacher or TA role required in classroom');
  }
  return membership;
}

/**
 * Require user to own the quiz
 * Throws AuthorizationError if user is not the quiz owner
 * Returns the quiz for convenience
 */
export async function requireQuizOwnership(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, createdByTeacherId: true },
  });

  if (!quiz) {
    throw new AuthorizationError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
  }
  if (quiz.createdByTeacherId !== userId) {
    throw new AuthorizationError('FORBIDDEN', 403, 'Quiz ownership required');
  }
  return quiz;
}

/**
 * Require user to own the pool
 * Throws AuthorizationError if user is not the pool owner
 * Returns the pool for convenience
 */
export async function requirePoolOwnership(userId: string, poolId: string) {
  const pool = await prisma.questionPool.findUnique({
    where: { id: poolId },
    select: { id: true, ownerTeacherId: true },
  });

  if (!pool) {
    throw new AuthorizationError('POOL_NOT_FOUND', 404, 'Pool not found');
  }
  if (pool.ownerTeacherId !== userId) {
    throw new AuthorizationError('FORBIDDEN', 403, 'Pool ownership required');
  }
  return pool;
}

/**
 * Require user to own the classroom
 * Throws AuthorizationError if user is not the classroom owner
 * Returns the classroom for convenience
 */
export async function requireClassroomOwnership(userId: string, classroomId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, ownerTeacherId: true },
  });

  if (!classroom) {
    throw new AuthorizationError('CLASSROOM_NOT_FOUND', 404, 'Classroom not found');
  }
  if (classroom.ownerTeacherId !== userId) {
    throw new AuthorizationError('FORBIDDEN', 403, 'Classroom ownership required');
  }
  return classroom;
}

/**
 * Require user to have access to the session
 * - Teacher: must own the quiz OR be a teacher/TA in the classroom
 * - Student: must be an active member of the classroom
 * Returns the session for convenience
 */
export async function requireSessionAccess(
  userId: string,
  sessionId: string,
  requiredRole?: 'teacher' | 'student',
) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      quiz: { select: { createdByTeacherId: true } },
      classroomId: true,
    },
  });

  if (!session) {
    throw new AuthorizationError('SESSION_NOT_FOUND', 404, 'Session not found');
  }

  // Check if user is teacher who owns the quiz
  const isQuizOwner = session.quiz.createdByTeacherId === userId;

  // Check classroom membership
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: session.classroomId, userId } },
    select: { status: true, roleInClass: true },
  });

  const isActiveMember = membership && membership.status === 'active';
  const isTeacherInClass = isActiveMember && (membership.roleInClass === 'teacher' || membership.roleInClass === 'ta');

  // Determine user's role for this session
  const userRole = isQuizOwner || isTeacherInClass ? 'teacher' : (isActiveMember ? 'student' : null);

  if (!userRole) {
    throw new AuthorizationError('FORBIDDEN', 403, 'Session access denied');
  }

  if (requiredRole && userRole !== requiredRole) {
    throw new AuthorizationError('FORBIDDEN', 403, `${requiredRole} role required for this session`);
  }

  return { session, userRole, isQuizOwner, isTeacherInClass };
}

/**
 * Require user to own the attempt
 * Throws error if user is not the attempt owner
 * Returns the attempt for convenience
 */
export async function requireAttemptAccess(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true },
  });

  if (!attempt) {
    throw new AuthorizationError('ATTEMPT_NOT_FOUND', 404, 'Attempt not found');
  }
  if (attempt.userId !== userId) {
    throw new AuthorizationError('FORBIDDEN', 403, 'Attempt access denied');
  }
  return attempt;
}
