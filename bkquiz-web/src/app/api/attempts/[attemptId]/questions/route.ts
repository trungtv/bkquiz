import { NextResponse } from 'next/server';
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  // ✅ Security: Check user owns this attempt
  try {
    await requireAttemptAccess(userId, attemptId);
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
  const reviewWindowMinutes = settings?.reviewDelayMinutes ?? null; // reviewDelayMinutes = cửa sổ thời gian cho phép xem (phút)
  const canReview =
    attemptFull.status === 'submitted' &&
    session.status === 'ended' &&
    session.endedAt !== null &&
    reviewWindowMinutes !== null &&
    (() => {
      const reviewWindowEnd = new Date(
        session.endedAt.getTime() + reviewWindowMinutes * 60 * 1000,
      );
      // Cho xem trong khoảng thời gian: từ khi session kết thúc đến hết cửa sổ
      return now >= session.endedAt && now <= reviewWindowEnd; // ✅ Server-side comparison
    })();

  const reviewWindowEnd = session.endedAt && reviewWindowMinutes !== null
    ? new Date(
        session.endedAt.getTime() + reviewWindowMinutes * 60 * 1000,
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

  const byId = new Map(raw.map((q) => [q.id, q]));
  type QuestionType = typeof raw[0];
  const questions: QuestionType[] = useAttemptOrder 
    ? sessionQuestionIds.map((id: string) => byId.get(id)).filter((q): q is QuestionType => q !== undefined)
    : raw;

  return NextResponse.json({
    questions: questions.map((q) => ({
      ...q,
      ...(canReview
        ? {
            studentSelected: answerMap.get(q.id) || [],
            questionScore: questionScoresMap?.[q.id] ?? null,
          }
        : {}),
    })),
    canReview,
    reviewWindowEnd: reviewWindowEnd?.toISOString() ?? null, // Thời điểm hết cửa sổ xem lại
    attemptStatus: attemptFull.status,
    sessionStatus: session.status,
  });
}
// EOF
