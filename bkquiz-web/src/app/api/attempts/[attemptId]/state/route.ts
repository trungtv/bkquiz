import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const GRACE_SECONDS_BEFORE_BLOCK = 5;

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      nextDueAt: true,
      failedCount: true,
      cooldownUntil: true,
      lockedUntil: true,
      QuizSession: {
        select: {
          id: true,
          status: true,
          Quiz: { select: { title: true } },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

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

  const { Quiz, ...sessionRest } = attempt.session;
  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    session: {
      ...sessionRest,
      quiz: Quiz,
    },
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
