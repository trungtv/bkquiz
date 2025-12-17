import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';

const ShareSchema = z.object({
  email: z.string().trim().email(),
  permission: z.enum(['view', 'use', 'edit']),
});

const UnshareSchema = z.object({
  email: z.string().trim().email(),
});

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;

  await requirePoolPermission(userId, poolId, 'edit');

  const shares = await prisma.questionPoolShare.findMany({
    where: { poolId },
    orderBy: { createdAt: 'desc' },
    select: {
      permission: true,
      createdAt: true,
      sharedWithTeacher: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ shares });
}

export async function POST(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;
  const body = ShareSchema.parse(await req.json());

  await requirePoolPermission(userId, poolId, 'edit');

  const target = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: 'CANNOT_SHARE_TO_SELF' }, { status: 400 });
  }

  const share = await prisma.questionPoolShare.upsert({
    where: { poolId_sharedWithTeacherId: { poolId, sharedWithTeacherId: target.id } },
    update: { permission: body.permission },
    create: { poolId, sharedWithTeacherId: target.id, permission: body.permission },
    select: {
      permission: true,
      createdAt: true,
      sharedWithTeacher: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ share });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;
  const body = UnshareSchema.parse(await req.json());

  await requirePoolPermission(userId, poolId, 'edit');

  const target = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  await prisma.questionPoolShare.delete({
    where: { poolId_sharedWithTeacherId: { poolId, sharedWithTeacherId: target.id } },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
