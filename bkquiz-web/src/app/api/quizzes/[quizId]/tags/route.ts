import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    await requireQuizOwnership(userId, quizId);

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
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    const body = UpdateTagsSchema.parse(await req.json());
    await requireQuizOwnership(userId, quizId);

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
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: error.issues }, { status: 400 });
    }
    throw error;
  }
}
