import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function POST(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  try {
    await requireSessionAccess(userId, sessionId, 'teacher');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'SESSION_NOT_FOUND') {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: 'ended',
      endedAt: new Date(),
    },
    select: { id: true, status: true, startedAt: true, endedAt: true },
  });

  return NextResponse.json(updated);
}
