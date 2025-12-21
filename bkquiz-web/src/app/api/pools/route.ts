import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

const CreatePoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  visibility: z.enum(['private', 'shared']).optional(),
});

export async function GET(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);

  const url = new URL(req.url);
  const tagsParam = url.searchParams.get('tags');

  // Parse tags filter
  const filterTagNames = tagsParam
    ? tagsParam.split(',').map(t => normalizeTagName(t.trim())).filter(Boolean)
    : [];

  // Build base where clause for owned pools
  let ownedWhereClause: any = {
    ownerTeacherId: userId,
  };

  // Add tags filter nếu có
  let filteredPoolIds: string[] | null = null;
  if (filterTagNames.length > 0) {
    // Find tag IDs
    const tags = await prisma.tag.findMany({
      where: { normalizedName: { in: filterTagNames } },
      select: { id: true },
    });

    const tagIds = tags.map(t => t.id);

    if (tagIds.length > 0) {
      // Filter: pool phải có TẤT CẢ tags (AND logic)
      const allPoolTags = await (prisma as any).questionPoolTag.findMany({
        where: { tagId: { in: tagIds } },
        select: { poolId: true, tagId: true },
      });

      // Group by poolId và count distinct tagIds
      const poolTagCounts = new Map<string, Set<string>>();
      for (const pt of allPoolTags) {
        if (!poolTagCounts.has(pt.poolId)) {
          poolTagCounts.set(pt.poolId, new Set());
        }
        poolTagCounts.get(pt.poolId)!.add(pt.tagId);
      }

      // Chỉ lấy poolIds có đủ số tags
      filteredPoolIds = Array.from(poolTagCounts.entries())
        .filter(([_, tagSet]) => tagSet.size === tagIds.length)
        .map(([poolId]) => poolId);

      if (filteredPoolIds.length === 0) {
        return NextResponse.json({ owned: [], shared: [] });
      }

      ownedWhereClause.id = { in: filteredPoolIds };
    } else {
      return NextResponse.json({ owned: [], shared: [] });
    }
  }

  const owned = await prisma.questionPool.findMany({
    where: ownedWhereClause,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      visibility: true,
      updatedAt: true,
      _count: {
        select: {
          questions: { where: { deletedAt: null } },
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              normalizedName: true,
            },
          },
        },
      },
    },
  });

  // Get tag counts for each pool
  const ownedWithTags = owned.map((pool) => {
    return {
      id: pool.id,
      name: pool.name,
      visibility: pool.visibility,
      updatedAt: pool.updatedAt,
      questionCount: pool._count.questions,
      tags: pool.tags.map((t: any) => t.tag),
    };
  });

  // Build where clause for shared pools
  let sharedWhereClause: any = {
    sharedWithTeacherId: userId,
  };

  // Apply tags filter to shared pools nếu có
  if (filteredPoolIds !== null) {
    sharedWhereClause.poolId = { in: filteredPoolIds };
  }

  const shared = await prisma.questionPoolShare.findMany({
    where: sharedWhereClause,
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
              questions: { where: { deletedAt: null } },
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  normalizedName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const sharedWithTags = shared.map((s) => {
    return {
      id: s.pool.id,
      name: s.pool.name,
      visibility: s.pool.visibility,
      updatedAt: s.pool.updatedAt,
      permission: s.permission,
      questionCount: s.pool._count.questions,
      tags: s.pool.tags.map((t: any) => t.tag),
    };
  });

  return NextResponse.json({
    owned: ownedWithTags,
    shared: sharedWithTags,
  });
}

export async function POST(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);
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
