import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';

  const tags = await prisma.tag.findMany({
    where: q
      ? {
          OR: [
            { normalizedName: { contains: q } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {},
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      name: true,
      normalizedName: true,
      _count: {
        select: {
          questionTags: true,
          classroomTags: true,
          quizTags: true,
          poolTags: true,
        },
      },
    },
  });

  return NextResponse.json({
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      normalizedName: t.normalizedName,
      questionCount: t._count.questionTags,
      classroomCount: t._count.classroomTags,
      quizCount: t._count.quizTags,
      poolCount: t._count.poolTags,
    })),
  });
}
