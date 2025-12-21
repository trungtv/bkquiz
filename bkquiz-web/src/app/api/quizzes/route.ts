import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

const CreateQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(['draft', 'published']).optional(),
});

export async function GET(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);

  const url = new URL(req.url);
  const tagsParam = url.searchParams.get('tags');

  // Parse tags filter
  const filterTagNames = tagsParam
    ? tagsParam.split(',').map(t => normalizeTagName(t.trim())).filter(Boolean)
    : [];

  // Build base where clause
  let whereClause: any = {
    createdByTeacherId: userId,
  };

  // Add tags filter nếu có
  let filteredQuizIds: string[] | null = null;
  if (filterTagNames.length > 0) {
    // Find tag IDs
    const tags = await prisma.tag.findMany({
      where: { normalizedName: { in: filterTagNames } },
      select: { id: true },
    });

    const tagIds = tags.map(t => t.id);

    if (tagIds.length > 0) {
      // Filter: quiz phải có TẤT CẢ tags (AND logic)
      const allQuizTags = await (prisma as any).quizTag.findMany({
        where: { tagId: { in: tagIds } },
        select: { quizId: true, tagId: true },
      });

      // Group by quizId và count distinct tagIds
      const quizTagCounts = new Map<string, Set<string>>();
      for (const qt of allQuizTags) {
        if (!quizTagCounts.has(qt.quizId)) {
          quizTagCounts.set(qt.quizId, new Set());
        }
        quizTagCounts.get(qt.quizId)!.add(qt.tagId);
      }

      // Chỉ lấy quizIds có đủ số tags
      filteredQuizIds = Array.from(quizTagCounts.entries())
        .filter(([_, tagSet]) => tagSet.size === tagIds.length)
        .map(([quizId]) => quizId);

      if (filteredQuizIds.length === 0) {
        return NextResponse.json({ quizzes: [] });
      }

      whereClause.id = { in: filteredQuizIds };
    } else {
      return NextResponse.json({ quizzes: [] });
    }
  }

  // Lấy tất cả quiz của teacher hiện tại
  const quizzes = await prisma.quiz.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      _count: { select: { rules: true } },
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

  return NextResponse.json({
    quizzes: quizzes.map(q => ({
      id: q.id,
      title: q.title,
      status: q.status,
      updatedAt: q.updatedAt,
      ruleCount: q._count.rules,
      tags: q.tags.map((t: any) => t.tag),
    })),
  });
}

export async function POST(req: Request) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const body = CreateQuizSchema.parse(await req.json());

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        createdByTeacherId: userId,
        status: body.status ?? 'draft',
      } as any, // Type assertion: Quiz no longer has classroomId after schema refactor
      select: { id: true, title: true, status: true },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: error.issues }, { status: 400 });
    }
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
// EOF
