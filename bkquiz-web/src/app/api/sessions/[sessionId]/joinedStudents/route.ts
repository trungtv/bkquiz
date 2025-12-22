import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
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

  // Get all attempts (students who joined)
  const attempts = await prisma.attempt.findMany({
    where: { sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    students: attempts.map(a => ({
      attemptId: a.id,
      userId: a.userId,
      name: a.user.name ?? a.user.email ?? 'N/A',
      email: a.user.email,
      status: a.status,
      joinedAt: a.createdAt,
    })),
  });
}
// EOF
