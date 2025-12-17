import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      session: { select: { status: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  await buildSessionSnapshotIfNeeded(attempt.sessionId);

  const attemptQuestions = await prisma.attemptQuestion.findMany({
    where: { attemptId },
    orderBy: { order: 'asc' },
    select: { sessionQuestionId: true },
  });

  const useAttemptOrder = attemptQuestions.length > 0;
  const sessionQuestionIds = attemptQuestions.map((aq: { sessionQuestionId: string }) => aq.sessionQuestionId);

  const raw = await prisma.sessionQuestionSnapshot.findMany({
    where: useAttemptOrder ? { id: { in: sessionQuestionIds } } : { sessionId: attempt.sessionId },
    orderBy: useAttemptOrder ? undefined : { order: 'asc' },
    select: {
      id: true,
      type: true,
      prompt: true,
      order: true,
      options: { orderBy: { order: 'asc' }, select: { order: true, content: true } },
    },
  });

  const byId = new Map(raw.map((q: { id: string }) => [q.id, q]));
  const questions = useAttemptOrder ? sessionQuestionIds.map((id: string) => byId.get(id)).filter(Boolean) : raw;

  return NextResponse.json({ questions });
}
// EOF
