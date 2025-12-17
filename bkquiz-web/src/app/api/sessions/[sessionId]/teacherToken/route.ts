import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { computeTotp } from '@/server/totp';

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      totpSecret: true,
      totpStepSeconds: true,
      quiz: { select: { classroomId: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: session.quiz.classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active' || (membership.roleInClass !== 'teacher' && membership.roleInClass !== 'ta')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { token, expiresInSeconds } = computeTotp({
    secret: session.totpSecret,
    stepSeconds: session.totpStepSeconds,
  });

  const joinUrl = `${getBaseUrl(req)}/session/${session.id}`;

  return NextResponse.json({
    sessionId: session.id,
    joinUrl,
    token,
    expiresInSeconds,
    stepSeconds: session.totpStepSeconds,
  });
}
