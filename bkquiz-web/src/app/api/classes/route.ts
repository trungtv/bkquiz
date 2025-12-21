import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { generateClassCode } from '@/utils/classCode';
import { normalizeTagName } from '@/utils/tags';

const CreateClassSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET(_req: Request) {
  const { userId } = await requireUser();
  const url = new URL(_req.url);
  const tagsParam = url.searchParams.get('tags');

  // Parse tags filter
  const filterTagNames = tagsParam
    ? tagsParam.split(',').map(t => normalizeTagName(t.trim())).filter(Boolean)
    : [];

  // Build base where clause
  let whereClause: any = {
    userId,
    status: 'active',
  };

  // Add tags filter nếu có
  let filteredClassroomIds: string[] | null = null;
  if (filterTagNames.length > 0) {
    // Find tag IDs
    const tags = await prisma.tag.findMany({
      where: { normalizedName: { in: filterTagNames } },
      select: { id: true },
    });

    const tagIds = tags.map(t => t.id);

    if (tagIds.length > 0) {
      // Filter: classroom phải có TẤT CẢ tags (AND logic)
      // Query tất cả ClassroomTag với tagIds, group by classroomId
      const allClassroomTags = await (prisma as any).classroomTag.findMany({
        where: { tagId: { in: tagIds } },
        select: { classroomId: true, tagId: true },
      });

      // Group by classroomId và count distinct tagIds
      const classroomTagCounts = new Map<string, Set<string>>();
      for (const ct of allClassroomTags) {
        if (!classroomTagCounts.has(ct.classroomId)) {
          classroomTagCounts.set(ct.classroomId, new Set());
        }
        classroomTagCounts.get(ct.classroomId)!.add(ct.tagId);
      }

      // Chỉ lấy classroomIds có đủ số tags (count = tagIds.length)
      filteredClassroomIds = Array.from(classroomTagCounts.entries())
        .filter(([_, tagSet]) => tagSet.size === tagIds.length)
        .map(([classroomId]) => classroomId);

      if (filteredClassroomIds.length === 0) {
        // Không có classroom nào có tất cả tags → return empty
        return NextResponse.json({ classes: [] });
      }

      whereClause.classroomId = { in: filteredClassroomIds };
    } else {
      // Không tìm thấy tags nào → return empty
      return NextResponse.json({ classes: [] });
    }
  }

  const memberships = await prisma.classMembership.findMany({
    where: whereClause,
    orderBy: { joinedAt: 'desc' },
    select: {
      roleInClass: true,
      joinedAt: true,
      classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
          createdAt: true,
          ownerTeacherId: true,
          _count: {
            select: {
              memberships: true,
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

  return NextResponse.json({
    classes: memberships.map(m => ({
      id: m.classroom.id,
      name: m.classroom.name,
      classCode: m.classroom.classCode,
      createdAt: m.classroom.createdAt,
      ownerTeacherId: m.classroom.ownerTeacherId,
      roleInClass: m.roleInClass,
      joinedAt: m.joinedAt,
      memberCount: m.classroom._count.memberships,
      tags: m.classroom.tags.map((t: any) => t.tag),
    })),
  });
}

export async function POST(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
  const body = CreateClassSchema.parse(await req.json());

  // Best effort unique classCode (low collision).
  let classCode = generateClassCode();
  for (let i = 0; i < 5; i += 1) {
    const exists = await prisma.classroom.findUnique({ where: { classCode } });
    if (!exists) {
      break;
    }
    classCode = generateClassCode();
  }

  const classroom = await prisma.classroom.create({
    data: {
      name: body.name,
      classCode,
      ownerTeacherId: userId,
      memberships: {
        create: {
          userId,
          roleInClass: 'teacher',
          status: 'active',
        },
      },
    },
    select: {
      id: true,
      name: true,
      classCode: true,
    },
  });

  return NextResponse.json(classroom);
}
