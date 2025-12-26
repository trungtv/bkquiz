import { NextResponse } from 'next/server';
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { calculateAttemptEndTime } from '@/server/attemptTimeLimit';

const GRACE_SECONDS_BEFORE_BLOCK = 5;

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  try {
    await requireAttemptAccess(userId, attemptId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      score: true,
      attemptStartedAt: true,
      nextDueAt: true,
      failedCount: true,
      cooldownUntil: true,
      lockedUntil: true,
      quizSession: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          settings: true,
          quiz: { select: { title: true } },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }

  // Extract sessionName from settings
  const settings = attempt.quizSession.settings as { sessionName?: string } | null;
  const sessionName = settings?.sessionName || null;

  const now = new Date();
  const warning = attempt.nextDueAt
    ? (
        attempt.nextDueAt.getTime() <= now.getTime()
        && attempt.nextDueAt.getTime() + GRACE_SECONDS_BEFORE_BLOCK * 1000 > now.getTime()
      )
    : false;
  const due = attempt.nextDueAt
    ? attempt.nextDueAt.getTime() + GRACE_SECONDS_BEFORE_BLOCK * 1000 <= now.getTime()
    : false;
  const inCooldown = attempt.cooldownUntil ? attempt.cooldownUntil.getTime() > now.getTime() : false;
  const isLocked = attempt.lockedUntil ? attempt.lockedUntil.getTime() > now.getTime() : attempt.status === 'locked';

  // Calculate time limit info
  const attemptEndTime = calculateAttemptEndTime(attempt);
  const timeRemaining = attemptEndTime
    ? Math.max(0, Math.floor((attemptEndTime.getTime() - now.getTime()) / 1000))
    : null;
  const isTimeUp = attemptEndTime ? now >= attemptEndTime : false;

  const a = attempt as any; // Prisma select types may not include all fields
  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    score: attempt.score,
    session: {
      ...a.quizSession,
      sessionName, // Add sessionName to response
    },
    attemptStartedAt: a.attemptStartedAt,
    attemptEndTime: attemptEndTime?.toISOString() ?? null,
    timeRemaining,
    isTimeUp,
    nextDueAt: attempt.nextDueAt,
    due,
    warning,
    graceSecondsBeforeBlock: GRACE_SECONDS_BEFORE_BLOCK,
    failedCount: attempt.failedCount,
    cooldownUntil: attempt.cooldownUntil,
    lockedUntil: attempt.lockedUntil,
    inCooldown,
    isLocked,
  });
}
// EOF
