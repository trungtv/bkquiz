import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';

const UpdatePoolSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  visibility: z.enum(['private', 'shared']).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;

  await requirePoolPermission(userId, poolId, 'view');

  const pool = await prisma.questionPool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerTeacherId: true,
      updatedAt: true,
    },
  });

  if (!pool) {
    return NextResponse.json({ error: 'POOL_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(pool);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
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
