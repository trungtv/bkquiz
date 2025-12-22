import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId } = await requireUser();
  const { quizId } = await ctx.params;

  // Check quiz exists và user là owner
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      createdByTeacherId: true,
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

  // Chỉ owner mới được xem tags
  if (quiz.createdByTeacherId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Get tags
  const tags = await prisma.quizTag.findMany({
    where: { quizId },
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    tags: tags.map(t => t.tag),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId } = await requireUser();
  const { quizId } = await ctx.params;
  const body = UpdateTagsSchema.parse(await req.json());

  try {
    await requireQuizOwnership(userId, quizId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'QUIZ_NOT_FOUND') {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Parse và validate tags
  const tagNames = parseTagsInput(body.tags);
  const validation = validateTagsCount(tagNames);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Upsert tags và lấy tag IDs
  const tagIds = await upsertTags(tagNames);

  // Update tags trong transaction
  await prisma.$transaction(async (tx) => {
    // Delete old tags
    await tx.quizTag.deleteMany({
      where: { quizId },
    });

    // Create new tags
    if (tagIds.length > 0) {
      await tx.quizTag.createMany({
        data: tagIds.map(tagId => ({
          quizId,
          tagId,
        })),
      });
    }
  });

  // Return updated tags
  const tags = await prisma.quizTag.findMany({
    where: { quizId },
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    tags: tags.map(t => t.tag),
  });
}
