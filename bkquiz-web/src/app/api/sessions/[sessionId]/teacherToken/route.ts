import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { computeTotp } from '@/server/totp';

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { sessionId } = await ctx.params;
    await requireSessionAccess(userId, sessionId, 'teacher');

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        totpSecret: true,
        totpStepSeconds: true,
      },
    });

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
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
