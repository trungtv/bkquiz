import { prisma } from '@/server/prisma';

export type PoolPermission = 'view' | 'use' | 'edit';

function permissionRank(p: PoolPermission) {
  if (p === 'view') {
    return 1;
  }
  if (p === 'use') {
    return 2;
  }
  return 3;
}

export async function getPoolPermission(userId: string, poolId: string) {
  const pool = await prisma.questionPool.findUnique({
    where: { id: poolId },
    select: { id: true, ownerTeacherId: true, name: true, visibility: true },
  });

  if (!pool) {
    return { pool: null, permission: null as PoolPermission | null };
  }

  if (pool.ownerTeacherId === userId) {
    return { pool, permission: 'edit' as const };
  }

  const share = await prisma.questionPoolShare.findUnique({
    where: { poolId_sharedWithTeacherId: { poolId, sharedWithTeacherId: userId } },
    select: { permission: true },
  });

  if (!share) {
    return { pool, permission: null as PoolPermission | null };
  }

  return { pool, permission: share.permission };
}

export async function requirePoolPermission(userId: string, poolId: string, required: PoolPermission) {
  const { pool, permission } = await getPoolPermission(userId, poolId);
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (!permission) {
    throw new Error('POOL_FORBIDDEN');
  }
  if (permissionRank(permission) < permissionRank(required)) {
    throw new Error('POOL_FORBIDDEN');
  }
  return { pool, permission };
}
