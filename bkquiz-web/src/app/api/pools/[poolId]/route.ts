import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';

const UpdatePoolSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  visibility: z.enum(['private', 'shared']).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
  const { poolId } = await ctx.params;

  const { pool, permission } = await requirePoolPermission(userId, poolId, 'view');

  // Get stats
  const [questionCount, tagGroups] = await Promise.all([
    prisma.question.count({
      where: { poolId, deletedAt: null },
    }),
    prisma.questionTag.groupBy({
      by: ['tagId'],
      where: {
        question: {
          poolId,
          deletedAt: null,
        },
      },
    }),
  ]);

  return NextResponse.json({
    id: pool.id,
    name: pool.name,
    visibility: pool.visibility,
    ownerTeacherId: pool.ownerTeacherId,
    permission,
    questionCount,
    tagCount: tagGroups.length,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
  const { poolId } = await ctx.params;
  const body = UpdatePoolSchema.parse(await req.json());

  await requirePoolPermission(userId, poolId, 'edit');

  const updated = await prisma.questionPool.update({
    where: { id: poolId },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.visibility ? { visibility: body.visibility } : {}),
    },
    select: { id: true, name: true, visibility: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
