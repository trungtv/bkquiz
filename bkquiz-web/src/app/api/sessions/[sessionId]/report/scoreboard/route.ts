import { NextResponse } from 'next/server';
import { requireSessionAccess, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';

function csvEscape(x: string) {
  if (x.includes('"') || x.includes(',') || x.includes('\n') || x.includes('\r')) {
    return `"${x.replaceAll('"', '""')}"`;
  }
  return x;
}

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { sessionId } = await ctx.params;
    const url = new URL(_.url);
    const format = url.searchParams.get('format');
    await requireSessionAccess(userId, sessionId, 'teacher');

    const attempts = await prisma.attempt.findMany({
      where: { sessionId },
      orderBy: [{ score: 'desc' }, { updatedAt: 'asc' }],
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (format === 'csv') {
      const headers = ['userId', 'email', 'name', 'attemptId', 'status', 'score', 'submittedAt'];
      const lines = [headers.join(',')];
      for (const a of attempts) {
        const email = a.user.email ?? '';
        const name = a.user.name ?? '';
        const submittedAt = a.submittedAt ? a.submittedAt.toISOString() : '';
        lines.push([
          csvEscape(a.user.id),
          csvEscape(email),
          csvEscape(name),
          csvEscape(a.id),
          csvEscape(a.status),
          csvEscape(a.score === null ? '' : String(a.score)),
          csvEscape(submittedAt),
        ].join(','));
      }
      return new NextResponse(lines.join('\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="scoreboard-${sessionId}.csv"`,
        },
      });
    }

    return NextResponse.json({ attempts });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
