import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hashToUint32(input: string) {
  let h = 0x811C9DC5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
}

export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      quizId: true,
      classroomId: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }
  if (session.status === 'ended') {
    return NextResponse.json({ error: 'SESSION_ENDED' }, { status: 400 });
  }

  // Verify student có trong classroom
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: session.classroomId, userId } },
    select: { status: true },
  });
  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'CLASSROOM_FORBIDDEN' }, { status: 403 });
  }

  const now = new Date();
  const nextDueAt = new Date(now.getTime() + randomInt(240, 300) * 1000);

  const attempt = await prisma.attempt.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    update: {
      status: 'active',
      lockedUntil: null,
      cooldownUntil: null,
      nextDueAt,
      lastVerifiedAt: null,
      failedCount: 0,
    },
    create: {
      sessionId,
      userId,
      status: 'active',
      nextDueAt,
      updatedAt: now,
    },
    select: { id: true, sessionId: true, nextDueAt: true, status: true },
  });

  // Nếu session đã active và attempt chưa bắt đầu, tự động start
  if (session.status === 'active') {
    const existingAttempt = await prisma.attempt.findUnique({
      where: { id: attempt.id },
      // @ts-expect-error - Prisma types may not be updated yet
      select: { attemptStartedAt: true },
    });
    // @ts-expect-error - Prisma types may not be updated yet
    if (!existingAttempt?.attemptStartedAt) {
      await prisma.attempt.update({
        where: { id: attempt.id },
        // @ts-expect-error - Prisma types may not be updated yet
        data: { attemptStartedAt: now },
      });
    }
  }

  // best-effort log
  await prisma.checkpointLog.create({
    data: {
      attemptId: attempt.id,
      type: 'scheduled',
      dueAt: attempt.nextDueAt,
    },
  }).catch(() => null);

  try {
    await buildSessionSnapshotIfNeeded(sessionId);
  } catch (err) {
    console.error('Error building session snapshot:', err);
    // Continue anyway - snapshot might already exist
  }

  const rules = await prisma.quizRule.findMany({
    where: { quizId: session.quizId },
    select: { tagId: true, commonCount: true, variantCount: true },
    orderBy: { updatedAt: 'desc' },
  });
  const isVariant = rules.some((r: { commonCount: number | null; variantCount: number | null }) => (r.commonCount ?? 0) > 0 || (r.variantCount ?? 0) > 0);
  if (isVariant) {
    const existing = await prisma.attemptQuestion.findFirst({
      where: { attemptId: attempt.id },
      select: { attemptId: true },
    });
    if (!existing) {
      let order = 0;
      for (const r of rules) {
        const commonCount = r.commonCount ?? 0;
        const variantCount = r.variantCount ?? 0;
        if (commonCount + variantCount <= 0) {
          continue;
        }

        const commonRows = await prisma.sessionCommonQuestion.findMany({
          where: { sessionId, tagId: r.tagId },
          orderBy: { order: 'asc' },
          select: { sessionQuestionId: true },
        });
        const commonIds = commonRows.map((x: { sessionQuestionId: string }) => x.sessionQuestionId).slice(0, commonCount);

        const pool = await prisma.sessionQuestionSnapshot.findMany({
          where: { sessionId, tagId: r.tagId, id: { notIn: commonIds } },
          orderBy: { order: 'asc' },
          select: { id: true },
        });
        const ids = pool.map((x: { id: string }) => x.id);
        const rand = mulberry32(hashToUint32(`${attempt.id}:${r.tagId}`));
        shuffleInPlace(ids, rand);
        const variantIds = ids.slice(0, variantCount);

        const chosen = [...commonIds, ...variantIds];
        await prisma.$transaction(chosen.map((sessionQuestionId: string) => prisma.attemptQuestion.create({
          data: { attemptId: attempt.id, sessionQuestionId, order: order++ },
        })));
      }
    }
  }

  return NextResponse.json({ attemptId: attempt.id, nextDueAt: attempt.nextDueAt, status: attempt.status });
}
// EOF
