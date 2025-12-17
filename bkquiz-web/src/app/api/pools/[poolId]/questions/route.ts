import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

type QuestionTagRow = { tag: { name: string; normalizedName: string } };
type QuestionOptionRow = { order: number; content: string; isCorrect: boolean };
type QuestionListRow = {
  id: string;
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  createdAt: Date;
  options: QuestionOptionRow[];
  tags: QuestionTagRow[];
};

const CreateQuestionSchema = z.object({
  type: z.enum(['mcq_single', 'mcq_multi']),
  prompt: z.string().trim().min(1),
  options: z.array(z.object({
    content: z.string().trim().min(1),
    isCorrect: z.boolean().optional(),
  })).min(2).max(12),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;

  await requirePoolPermission(userId, poolId, 'view');

  const questions = await prisma.question.findMany({
    where: { poolId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      prompt: true,
      createdAt: true,
      options: { where: { deletedAt: null }, orderBy: { order: 'asc' }, select: { order: true, content: true, isCorrect: true } },
      tags: { select: { tag: { select: { name: true, normalizedName: true } } } },
    },
  });

  const typedQuestions = questions as unknown as QuestionListRow[];

  return NextResponse.json({
    questions: typedQuestions.map(q => ({
      ...q,
      tags: q.tags.map(t => t.tag),
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;
  const body = CreateQuestionSchema.parse(await req.json());

  await requirePoolPermission(userId, poolId, 'edit');

  const correctCount = body.options.filter(o => !!o.isCorrect).length;
  if (body.type === 'mcq_single' && correctCount !== 1) {
    return NextResponse.json({ error: 'MCQ_SINGLE_NEEDS_EXACTLY_ONE_CORRECT' }, { status: 400 });
  }
  if (body.type === 'mcq_multi' && correctCount < 1) {
    return NextResponse.json({ error: 'MCQ_MULTI_NEEDS_AT_LEAST_ONE_CORRECT' }, { status: 400 });
  }

  const q = await prisma.question.create({
    data: {
      poolId,
      type: body.type,
      prompt: body.prompt,
      createdByTeacherId: userId,
      options: {
        create: body.options.map((o, idx) => ({
          content: o.content,
          isCorrect: !!o.isCorrect,
          order: idx,
        })),
      },
    },
    select: { id: true },
  });

  const tags = (body.tags ?? []).map(t => t.trim()).filter(Boolean);
  for (const name of tags) {
    const normalizedName = normalizeTagName(name);

    const tag = await prisma.tag.upsert({
      where: { normalizedName },
      update: { name },
      create: { name, normalizedName },
      select: { id: true },
    });

    await prisma.questionTag.create({
      data: { questionId: q.id, tagId: tag.id },
    }).catch(() => null);
  }

  return NextResponse.json({ id: q.id });
}
