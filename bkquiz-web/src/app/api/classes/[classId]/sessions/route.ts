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

  return NextResponse.json({
    sessions: sessions.map(s => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      createdAt: s.createdAt,
      quiz: s.quiz,
      attemptCount: s._count.attempts,
    })),
  });
}

