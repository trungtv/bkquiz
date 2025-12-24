import { NextResponse } from 'next/server';
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  // ✅ Security: Check user owns this attempt
  let attempt;
  try {
    attempt = await requireAttemptAccess(userId, attemptId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const attemptFull = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      sessionId: true,
      questionScores: true, // Cache điểm từng câu
      quizSession: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          settings: true, // JSONB field
        },
      },
    },
  });

  if (!attemptFull) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }

  await buildSessionSnapshotIfNeeded(attemptFull.sessionId);

  const session = attemptFull.quizSession;
  const settings = session.settings as {
    reviewDelayMinutes?: number | null;
    bufferMinutes?: number;
    durationSeconds?: number;
  } | null;

  // ✅ SECURITY: Server-side time check (không thể hack)
  const now = new Date(); // Server time
  const reviewDelayMinutes = settings?.reviewDelayMinutes ?? null;
  const canReview =
    attemptFull.status === 'submitted' &&
    session.status === 'ended' &&
    session.endedAt !== null &&
    reviewDelayMinutes !== null &&
    (() => {
      const reviewAvailableAt = new Date(
        session.endedAt.getTime() + reviewDelayMinutes * 60 * 1000,
      );
      return now >= reviewAvailableAt; // ✅ Server-side comparison
    })();

  const reviewAvailableAt = session.endedAt && reviewDelayMinutes !== null
    ? new Date(
        session.endedAt.getTime() + reviewDelayMinutes * 60 * 1000,
      )
    : null;

  const attemptQuestions = await prisma.attemptQuestion.findMany({
    where: { attemptId },
    orderBy: { order: 'asc' },
    select: { sessionQuestionId: true },
  });

  const useAttemptOrder = attemptQuestions.length > 0;
  const sessionQuestionIds = attemptQuestions.map((aq: { sessionQuestionId: string }) => aq.sessionQuestionId);

  const raw = await prisma.sessionQuestionSnapshot.findMany({
    where: useAttemptOrder ? { id: { in: sessionQuestionIds } } : { sessionId: attemptFull.sessionId },
    orderBy: useAttemptOrder ? undefined : { order: 'asc' },
    select: {
      id: true,
      type: true,
      prompt: true,
      order: true,
      options: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          content: true,
          ...(canReview ? { isCorrect: true } : {}), // ✅ Chỉ trả về isCorrect khi canReview
        },
      },
    },
  });

  // Get student's answers if submitted
  const answers = attemptFull.status === 'submitted'
    ? await prisma.answer.findMany({
        where: { attemptId },
        select: { sessionQuestionId: true, selected: true },
      })
    : [];

  const answerMap = new Map(answers.map(a => [a.sessionQuestionId, a.selected]));

  // Get question scores from cache
  const questionScoresMap = attemptFull.questionScores
    ? (attemptFull.questionScores as Record<string, number>)
    : null;

  const byId = new Map(raw.map((q: { id: string }) => [q.id, q]));
  const questions = useAttemptOrder ? sessionQuestionIds.map((id: string) => byId.get(id)).filter(Boolean) : raw;

  return NextResponse.json({
    questions: questions.map((q: { id: string; type: string; prompt: string; order: number; options: Array<{ order: number; content: string; isCorrect?: boolean }> }) => ({
      ...q,
      ...(canReview ? {
        studentSelected: answerMap.get(q.id) || [],
        questionScore: questionScoresMap?.[q.id] ?? null,
      } : {}),
    })),
    canReview,
    reviewAvailableAt: reviewAvailableAt?.toISOString() ?? null,
    attemptStatus: attemptFull.status,
    sessionStatus: session.status,
  });
}
// EOF
