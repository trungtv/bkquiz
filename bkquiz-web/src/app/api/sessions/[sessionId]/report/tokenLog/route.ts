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
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;
  const url = new URL(_.url);
  const format = url.searchParams.get('format');

  try {
    await requireSessionAccess(userId, sessionId, 'teacher');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'SESSION_NOT_FOUND') {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const logs = await prisma.checkpointLog.findMany({
    where: { attempt: { sessionId } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      type: true,
      ok: true,
      createdAt: true,
      dueAt: true,
      enteredToken: true,
      attempt: {
        select: {
          id: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (format === 'csv') {
    const headers = [
      'createdAt',
      'type',
      'ok',
      'dueAt',
      'enteredToken',
      'attemptId',
      'userId',
      'email',
      'name',
    ];
    const lines = [headers.join(',')];
    for (const l of logs) {
      const email = l.attempt.user.email ?? '';
      const name = l.attempt.user.name ?? '';
      lines.push([
        csvEscape(l.createdAt.toISOString()),
        csvEscape(String(l.type)),
        csvEscape(l.ok === null ? '' : String(l.ok)),
        csvEscape(l.dueAt ? l.dueAt.toISOString() : ''),
        csvEscape(l.enteredToken ?? ''),
        csvEscape(l.attempt.id),
        csvEscape(l.attempt.user.id),
        csvEscape(email),
        csvEscape(name),
      ].join(','));
    }
    return new NextResponse(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="token-log-${sessionId}.csv"`,
      },
    });
  }

    return NextResponse.json({
      logs: logs.map(l => ({
        id: l.id,
        type: l.type,
        ok: l.ok,
        createdAt: l.createdAt,
        dueAt: l.dueAt,
        enteredToken: l.enteredToken,
        attemptId: l.attempt.id,
        user: l.attempt.user,
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
