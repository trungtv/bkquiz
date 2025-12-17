import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { id: true, quiz: { select: { classroomId: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: session.quiz.classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active' || (membership.roleInClass !== 'teacher' && membership.roleInClass !== 'ta')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: 'ended',
      endedAt: new Date(),
    },
    select: { id: true, status: true, startedAt: true, endedAt: true },
  });

  return NextResponse.json(updated);
}
