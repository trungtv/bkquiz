import { NextResponse } from 'next/server';
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

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
      nextDueAt: true,
      failedCount: true,
      cooldownUntil: true,
      lockedUntil: true,
      quizSession: {
        select: {
          id: true,
          status: true,
          quiz: { select: { title: true } },
        },
      },
    },
  });

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

  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    session: attempt.quizSession,
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
