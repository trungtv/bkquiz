import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { requirePoolPermission } from '@/server/poolAuthz';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;

  // Check pool exists và user có quyền view
  await requirePoolPermission(userId, poolId, 'view');

  // Get tags
  const tags = await prisma.questionPoolTag.findMany({
    where: { poolId },
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

export async function PATCH(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;
  const body = UpdateTagsSchema.parse(await req.json());

  // Check pool exists và user có quyền edit
  await requirePoolPermission(userId, poolId, 'edit');

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
    await tx.questionPoolTag.deleteMany({
      where: { poolId },
    });

    // Create new tags
    if (tagIds.length > 0) {
      await tx.questionPoolTag.createMany({
        data: tagIds.map(tagId => ({
          poolId,
          tagId,
        })),
      });
    }
  });

  // Return updated tags
  const tags = await prisma.questionPoolTag.findMany({
    where: { poolId },
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
