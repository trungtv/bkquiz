import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const CreatePoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  visibility: z.enum(['private', 'shared']).optional(),
});

export async function GET() {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);

  const owned = await prisma.questionPool.findMany({
    where: { ownerTeacherId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      visibility: true,
      updatedAt: true,
      _count: {
        select: {
          Question: { where: { deletedAt: null } },
        },
      },
    },
  });

  // Get tag counts for each pool
  const ownedWithTags = await Promise.all(
    owned.map(async (pool) => {
      // Use groupBy to count distinct tags
      const tagGroups = await prisma.questionTag.groupBy({
        by: ['tagId'],
        where: {
          question: {
            poolId: pool.id,
            deletedAt: null,
          },
        },
      });
      return {
        ...pool,
        questionCount: pool._count.Question,
        tagCount: tagGroups.length,
      };
    }),
  );

  const shared = await prisma.questionPoolShare.findMany({
    where: { sharedWithTeacherId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      permission: true,
      pool: {
        select: {
          id: true,
          name: true,
          visibility: true,
          updatedAt: true,
          _count: {
            select: {
              Question: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });

  const sharedWithTags = await Promise.all(
    shared.map(async (s) => {
      // Use groupBy to count distinct tags
      const tagGroups = await prisma.questionTag.groupBy({
        by: ['tagId'],
        where: {
          question: {
            poolId: s.pool.id,
            deletedAt: null,
          },
        },
      });
      return {
        ...s.pool,
        permission: s.permission,
        questionCount: s.pool._count.Question,
        tagCount: tagGroups.length,
      };
    }),
  );

  return NextResponse.json({
    owned: ownedWithTags,
    shared: sharedWithTags,
  });
}

export async function POST(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
  const body = CreatePoolSchema.parse(await req.json());

  const pool = await prisma.questionPool.create({
    data: {
      name: body.name,
      visibility: body.visibility ?? 'private',
      ownerTeacherId: userId,
    },
    select: { id: true, name: true, visibility: true },
  });

  return NextResponse.json(pool);
}
