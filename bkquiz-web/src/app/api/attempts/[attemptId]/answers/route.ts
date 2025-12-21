import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

type AnswerRow = Awaited<ReturnType<typeof prisma.answer.findMany>>[number];
type OptionRow = { order: number };

const UpsertAnswerSchema = z.object({
  sessionQuestionId: z.string().trim().min(1),
  selected: z.array(z.number().int().min(0)).max(50),
});

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, status: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const answers = await prisma.answer.findMany({
    where: { attemptId },
    select: { sessionQuestionId: true, selected: true, updatedAt: true },
  });

  return NextResponse.json({
    answers: (answers as AnswerRow[]).map(a => ({
      sessionQuestionId: a.sessionQuestionId,
      selected: a.selected,
      updatedAt: a.updatedAt,
    })),
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;
  const body = UpsertAnswerSchema.parse(await req.json());

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, status: true, sessionId: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (attempt.status !== 'active') {
    return NextResponse.json({ error: 'ATTEMPT_NOT_ACTIVE' }, { status: 400 });
  }

  const q = await prisma.sessionQuestionSnapshot.findUnique({
    where: { id: body.sessionQuestionId },
    select: { id: true, sessionId: true, type: true, options: { select: { order: true } } },
  });
  if (!q || q.sessionId !== attempt.sessionId) {
    return NextResponse.json({ error: 'QUESTION_NOT_FOUND' }, { status: 404 });
  }

  const maxOrder = (q.options as OptionRow[]).reduce((m: number, o: OptionRow) => Math.max(m, o.order), -1);
  const unique = Array.from(new Set(body.selected)).filter(n => n >= 0 && n <= maxOrder).sort((a, b) => a - b);
  if (q.type === 'mcq_single' && unique.length > 1) {
    return NextResponse.json({ error: 'MCQ_SINGLE_ONLY_ONE' }, { status: 400 });
  }

  const now = new Date();
  await prisma.answer.upsert({
    where: { attemptId_sessionQuestionId: { attemptId, sessionQuestionId: body.sessionQuestionId } },
    update: { selected: unique as unknown as any, updatedAt: now },
    create: { attemptId, sessionQuestionId: body.sessionQuestionId, selected: unique as unknown as any, updatedAt: now },
    select: { attemptId: true },
  });

  return NextResponse.json({ ok: true });
}
// EOF
