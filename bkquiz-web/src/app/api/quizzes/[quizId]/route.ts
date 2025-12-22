import { NextResponse } from 'next/server';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);
  const { quizId } = await ctx.params;

  try {
    await requireQuizOwnership(userId, quizId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'QUIZ_NOT_FOUND') {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    updatedAt: quiz.updatedAt.toISOString(),
    createdAt: quiz.createdAt.toISOString(),
  });
}

