import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId } = await requireUser();
  const { quizId } = await ctx.params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      classroomId: true,
      classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: quiz.classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    updatedAt: quiz.updatedAt.toISOString(),
    createdAt: quiz.createdAt.toISOString(),
    classroom: quiz.classroom,
  });
}

