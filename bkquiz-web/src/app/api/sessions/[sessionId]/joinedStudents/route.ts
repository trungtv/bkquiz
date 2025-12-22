import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  // Check session exists and user has access
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      quiz: {
        select: {
          createdByTeacherId: true,
        },
      },
      classroomId: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // Check if user is teacher who owns the quiz or member of the classroom
  const isTeacher = session.quiz.createdByTeacherId === userId;
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: session.classroomId, userId } },
    select: { status: true, roleInClass: true },
  });

  if (!isTeacher && (!membership || membership.status !== 'active')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Get all attempts (students who joined)
  const attempts = await prisma.attempt.findMany({
    where: { sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    students: attempts.map(a => ({
      attemptId: a.id,
      userId: a.userId,
      name: a.user.name ?? a.user.email ?? 'N/A',
      email: a.user.email,
      status: a.status,
      joinedAt: a.createdAt,
    })),
  });
}
// EOF
