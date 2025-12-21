import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  // Check session exists and teacher has permission
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      quiz: {
        select: {
          id: true,
          createdByTeacherId: true,
        },
      },
      classroom: {
        select: {
          id: true,
          memberships: {
            where: {
              userId,
              status: 'active',
              roleInClass: { in: ['teacher', 'ta'] },
            },
            select: { roleInClass: true },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // Check authorization: teacher must be quiz owner OR classroom member
  const isOwner = session.quiz.createdByTeacherId === userId;
  const isMember = session.classroom.memberships.length > 0;

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Build snapshot if needed (will check internally if already built)
  await buildSessionSnapshotIfNeeded(sessionId);

  // Query questions from snapshot
  const questions = await prisma.sessionQuestionSnapshot.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      prompt: true,
      sourceQuestionId: true,
      options: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          content: true,
          isCorrect: true,
        },
      },
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
  });

  return NextResponse.json({
    questions: questions.map(q => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      sourceQuestionId: q.sourceQuestionId,
      options: q.options,
      tag: q.tag || undefined, // Convert null to undefined
    })),
    total: questions.length,
    sessionId,
  });
}
