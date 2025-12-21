import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { verifyTotp } from '@/server/totp';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const VerifySchema = z.object({
  token: z.string().trim().min(4).max(12),
});

export async function POST(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;
  const body = VerifySchema.parse(await req.json());

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      failedCount: true,
      cooldownUntil: true,
      lockedUntil: true,
      QuizSession: { select: { id: true, status: true, totpSecret: true, totpStepSeconds: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (attempt.QuizSession.status !== 'active') {
    return NextResponse.json({ error: 'SESSION_NOT_ACTIVE' }, { status: 400 });
  }

  const now = new Date();
  const inCooldown = attempt.cooldownUntil ? attempt.cooldownUntil.getTime() > now.getTime() : false;
  const isLocked = attempt.lockedUntil ? attempt.lockedUntil.getTime() > now.getTime() : attempt.status === 'locked';
  if (isLocked) {
    return NextResponse.json({ error: 'ATTEMPT_LOCKED', lockedUntil: attempt.lockedUntil }, { status: 403 });
  }
  if (inCooldown) {
    return NextResponse.json({ error: 'COOLDOWN', cooldownUntil: attempt.cooldownUntil }, { status: 429 });
  }

  const ok = verifyTotp({
    secret: attempt.QuizSession.totpSecret,
    stepSeconds: attempt.QuizSession.totpStepSeconds,
    token: body.token,
    window: 1,
  });

  if (ok) {
    const nextDueAt = new Date(Date.now() + randomInt(240, 300) * 1000);
    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'active',
        failedCount: 0,
        cooldownUntil: null,
        lockedUntil: null,
        nextDueAt,
        lastVerifiedAt: new Date(),
      },
      select: { id: true, nextDueAt: true, status: true },
    });
    await prisma.checkpointLog.create({
      data: {
        attemptId,
        type: 'verify_ok',
        ok: true,
        enteredToken: body.token,
        dueAt: nextDueAt,
      },
    }).catch(() => null);
    return NextResponse.json({ ok: true, ...updated });
  }

  const failedCount = attempt.failedCount + 1;
  const cooldownUntil = failedCount >= 3 ? new Date(Date.now() + 30 * 1000) : null;
  const lockedUntil = failedCount >= 6 ? new Date(Date.now() + 5 * 60 * 1000) : null;

  const updated = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      failedCount,
      cooldownUntil,
      lockedUntil,
      status: lockedUntil ? 'locked' : attempt.status,
    },
    select: { id: true, failedCount: true, cooldownUntil: true, lockedUntil: true, status: true },
  });

  await prisma.checkpointLog.create({
    data: {
      attemptId,
      type: lockedUntil ? 'locked' : 'verify_fail',
      ok: false,
      enteredToken: body.token,
    },
  }).catch(() => null);

  return NextResponse.json({ ok: false, ...updated }, { status: 400 });
}
// EOF
