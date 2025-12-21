import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, quiz: { select: { createdByTeacherId: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // Chỉ teacher sở hữu quiz mới được start session
  if (session.quiz.createdByTeacherId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: 'active',
      startedAt: session.status === 'lobby' ? new Date() : undefined,
      endedAt: null,
    },
    select: { id: true, status: true, startedAt: true, endedAt: true },
  });

  try {
    const snapshot = await buildSessionSnapshotIfNeeded(sessionId);
    return NextResponse.json({ ...updated, snapshot });
  } catch (err) {
    console.error('Error building session snapshot:', err);
    return NextResponse.json(
      { error: 'SNAPSHOT_BUILD_FAILED', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
