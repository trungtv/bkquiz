import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { sessionId } = await ctx.params;
    await requireSessionAccess(userId, sessionId, 'teacher');

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
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
// EOF
