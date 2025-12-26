import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireUser } from '@/server/authz';
import { parsePoolMarkdown } from '@/server/import/markdownPool';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

const UpdateQuestionFromMarkdownSchema = z.object({
  markdown: z.string().trim().min(1),
});

export async function DELETE(_: Request, ctx: { params: Promise<{ questionId: string }> }) {
  const { userId } = await requireUser();
  const { questionId } = await ctx.params;

  // Get question to find poolId
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { poolId: true, deletedAt: true },
  });

  if (!question) {
    return NextResponse.json({ error: 'QUESTION_NOT_FOUND' }, { status: 404 });
  }

  if (question.deletedAt) {
    return NextResponse.json({ error: 'QUESTION_ALREADY_DELETED' }, { status: 400 });
  }

  // Check permission
  await requirePoolPermission(userId, question.poolId, 'edit');

  // Soft delete
  await prisma.question.update({
    where: { id: questionId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ questionId: string }> }) {
  const { userId } = await requireUser();
  const { questionId } = await ctx.params;
  const body = UpdateQuestionFromMarkdownSchema.parse(await req.json());

  // Get question to find poolId
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { poolId: true, deletedAt: true },
  });

  if (!question) {
    return NextResponse.json({ error: 'QUESTION_NOT_FOUND' }, { status: 404 });
  }

  if (question.deletedAt) {
    return NextResponse.json({ error: 'QUESTION_ALREADY_DELETED' }, { status: 400 });
  }

  // Check permission
  await requirePoolPermission(userId, question.poolId, 'edit');

  // Parse markdown - wrap in pool format to reuse parser
  // Format: pool header (minimal) + question block
  const poolHeader = '---\npool:\n  name: "temp"\n  visibility: "private"\n---\n\n';
  const fullMarkdown = poolHeader + body.markdown;

  let parsed;
  try {
    parsed = parsePoolMarkdown(fullMarkdown);
  } catch (error) {
    return NextResponse.json({ error: 'PARSE_ERROR', message: String(error) }, { status: 400 });
  }

  if (parsed.questions.length !== 1) {
    return NextResponse.json({ error: 'MARKDOWN_MUST_CONTAIN_EXACTLY_ONE_QUESTION' }, { status: 400 });
  }

  const imported = parsed.questions[0];
  if (!imported) {
    return NextResponse.json({ error: 'MARKDOWN_MUST_CONTAIN_EXACTLY_ONE_QUESTION' }, { status: 400 });
  }

  // Validate
  const correctCount = imported.options.filter(o => o.isCorrect).length;
  if (imported.type === 'mcq_single' && correctCount !== 1) {
    return NextResponse.json({ error: 'MCQ_SINGLE_NEEDS_EXACTLY_ONE_CORRECT' }, { status: 400 });
  }
  if (imported.type === 'mcq_multi' && correctCount < 1) {
    return NextResponse.json({ error: 'MCQ_MULTI_NEEDS_AT_LEAST_ONE_CORRECT' }, { status: 400 });
  }

  // Update question in transaction
  await prisma.$transaction(async (tx) => {
    // Update question
    await tx.question.update({
      where: { id: questionId },
      data: {
        type: imported.type,
        prompt: imported.prompt,
      },
    });

    // Delete old options
    await tx.option.updateMany({
      where: { questionId },
      data: { deletedAt: new Date() },
    });

    // Create new options
    await tx.option.createMany({
      data: imported.options.map((o, idx) => ({
        id: nanoid(),
        questionId,
        content: o.content,
        isCorrect: o.isCorrect,
        order: idx,
        updatedAt: new Date(),
      })),
    });

    // Delete old tags
    await tx.questionTag.deleteMany({
      where: { questionId },
    });

    // Create new tags
    const tags = (imported.tags ?? []).map(t => t.trim()).filter(Boolean);
    for (const name of tags) {
      const normalizedName = normalizeTagName(name);

      const tag = await tx.tag.upsert({
        where: { normalizedName },
        update: { name },
        create: { name, normalizedName },
        select: { id: true },
      });

      await tx.questionTag.create({
        data: { questionId, tagId: tag.id },
      }).catch(() => null);
    }
  });

  return NextResponse.json({ ok: true });
}
