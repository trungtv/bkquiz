import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { sessionId } = await ctx.params;
    await requireSessionAccess(userId, sessionId, 'teacher');

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  // Build snapshot if needed (will check internally if already built)
  await buildSessionSnapshotIfNeeded(sessionId);

  // Query questions from snapshot
  const questions = await prisma.sessionQuestionSnapshot.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      prompt: true,
      sourceQuestionId: true,
      options: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          content: true,
          isCorrect: true,
        },
      },
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
  });

    return NextResponse.json({
      questions: questions.map(q => ({
        id: q.id,
        order: q.order,
        type: q.type,
        prompt: q.prompt,
        sourceQuestionId: q.sourceQuestionId,
        options: q.options,
        tag: q.tag || undefined, // Convert null to undefined
      })),
      total: questions.length,
      sessionId,
    });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
