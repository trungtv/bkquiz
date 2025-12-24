import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  // Check user has access to this classroom
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: classId, userId } },
    select: { status: true, roleInClass: true },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Query sessions của class này
  const sessions = await prisma.quizSession.findMany({
    where: {
      classroomId: classId,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      settings: true, // Include settings to get sessionName
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
    take: 50, // Limit để tránh quá nhiều data
  });

  // Get user's attempts for these sessions (if student)
  const sessionIds = sessions.map(s => s.id);
  const userAttempts = await prisma.attempt.findMany({
    where: {
      userId,
      sessionId: { in: sessionIds },
    },
    select: {
      id: true,
      sessionId: true,
      score: true,
      submittedAt: true,
      status: true,
    },
  });

  const attemptMap = new Map(userAttempts.map(a => [a.sessionId, a]));

  return NextResponse.json({
    sessions: sessions.map(s => {
      // Parse settings from JSONB
      const settings = s.settings as { sessionName?: string; durationSeconds?: number; scheduledStartAt?: string } | null;
      const sessionName = settings?.sessionName;
      const durationSeconds = settings?.durationSeconds;
      const scheduledStartAt = settings?.scheduledStartAt;
      const userAttempt = attemptMap.get(s.id);
      return {
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        quiz: s.quiz,
        attemptCount: s._count.attempts,
        sessionName: sessionName || null,
        durationSeconds: durationSeconds || null, // Duration in seconds
        scheduledStartAt: scheduledStartAt || null, // Scheduled start time (for lobby sessions)
        attempt: userAttempt
          ? {
              id: userAttempt.id,
              score: userAttempt.score,
              submittedAt: userAttempt.submittedAt,
              status: userAttempt.status,
            }
          : undefined,
      };
    }),
  });
}

