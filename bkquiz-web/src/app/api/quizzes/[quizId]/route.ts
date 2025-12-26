import { NextResponse } from 'next/server';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    await requireQuizOwnership(userId, quizId);

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

    if (!quiz) {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      updatedAt: quiz.updatedAt.toISOString(),
      createdAt: quiz.createdAt.toISOString(),
    });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}

