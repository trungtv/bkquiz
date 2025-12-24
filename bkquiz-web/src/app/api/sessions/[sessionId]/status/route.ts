import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/authz';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      totpStepSeconds: true,
      createdAt: true,
      // @ts-expect-error - settings is JSONB field, Prisma types may not include it
      settings: true,
      _count: {
        select: {
          attempts: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // @ts-expect-error - settings is JSONB field
  const settings = session.settings as { sessionName?: string } | null;
  const sessionName = settings?.sessionName || null;

  // Check if current user has joined (has attempt) - optional, don't fail if not authenticated
  let attemptId: string | null = null;
  try {
    const { userId } = await requireUser();
    const attempt = await prisma.attempt.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      select: { id: true },
    });
    attemptId = attempt?.id ?? null;
  } catch {
    // User not authenticated, attemptId remains null
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    createdAt: session.createdAt,
    totpStepSeconds: session.totpStepSeconds,
    attemptCount: (session as any)._count.attempts,
    quiz: (session as any).quiz,
    classroom: (session as any).classroom,
    sessionName,
    attemptId, // null if not joined or not authenticated
  });
}
// EOF
