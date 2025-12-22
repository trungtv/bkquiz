import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacherInClassroom, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  try {
    await requireTeacherInClassroom(userId, classId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'CLASSROOM_NOT_FOUND') {
      return NextResponse.json({ error: 'CLASSROOM_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Get tags
  const tags = await (prisma as any).classroomTag.findMany({
    where: { classroomId: classId },
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
    tags: tags.map((t: any) => t.tag),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;
  const body = UpdateTagsSchema.parse(await req.json());

  try {
    await requireTeacherInClassroom(userId, classId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'CLASSROOM_NOT_FOUND') {
      return NextResponse.json({ error: 'CLASSROOM_NOT_FOUND' }, { status: 404 });
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
  await prisma.$transaction(async (tx: any) => {
    // Delete old tags
    await tx.classroomTag.deleteMany({
      where: { classroomId: classId },
    });

    // Create new tags
    if (tagIds.length > 0) {
      await tx.classroomTag.createMany({
        data: tagIds.map(tagId => ({
          classroomId: classId,
          tagId,
        })),
      });
    }
  });

  // Return updated tags
  const tags = await (prisma as any).classroomTag.findMany({
    where: { classroomId: classId },
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
    tags: tags.map((t: any) => t.tag),
  });
}
