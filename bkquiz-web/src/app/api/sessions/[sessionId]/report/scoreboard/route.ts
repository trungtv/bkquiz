import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
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

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { id: true, quiz: { select: { createdByTeacherId: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // Chỉ teacher sở hữu quiz mới được xem scoreboard
  if (session.quiz.createdByTeacherId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

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
}
