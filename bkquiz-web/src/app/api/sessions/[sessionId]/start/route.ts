import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { sessionId } = await ctx.params;
    await requireSessionAccess(userId, sessionId, 'teacher');

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
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
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
