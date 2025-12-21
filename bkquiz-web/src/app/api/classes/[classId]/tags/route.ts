import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  // Check classroom exists và user có quyền
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    select: {
      id: true,
      ownerTeacherId: true,
      memberships: {
        where: {
          userId,
          status: 'active',
          roleInClass: { in: ['teacher', 'ta'] },
        },
        select: { roleInClass: true },
      },
    },
  });

  if (!classroom) {
    return NextResponse.json({ error: 'CLASSROOM_NOT_FOUND' }, { status: 404 });
  }

  const isOwner = classroom.ownerTeacherId === userId;
  const isMember = classroom.memberships.length > 0;

  if (!isOwner && !isMember) {
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

  // Check classroom exists và user có quyền
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    select: {
      id: true,
      ownerTeacherId: true,
      memberships: {
        where: {
          userId,
          status: 'active',
          roleInClass: { in: ['teacher', 'ta'] },
        },
        select: { roleInClass: true },
      },
    },
  });

  if (!classroom) {
    return NextResponse.json({ error: 'CLASSROOM_NOT_FOUND' }, { status: 404 });
  }

  const isOwner = classroom.ownerTeacherId === userId;
  const isMember = classroom.memberships.length > 0;

  if (!isOwner && !isMember) {
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
