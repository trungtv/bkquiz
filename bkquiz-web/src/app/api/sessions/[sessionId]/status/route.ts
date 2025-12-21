import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

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
      quiz: {
        select: {
          id: true,
          title: true,
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

  return NextResponse.json({
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    totpStepSeconds: session.totpStepSeconds,
    quiz: session.quiz,
    classroom: session.classroom,
  });
}
// EOF
