import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const CreateQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(['draft', 'published']).optional(),
});

export async function GET(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);

  // Lấy tất cả quiz của teacher hiện tại
  const quizzes = await prisma.quiz.findMany({
    where: { createdByTeacherId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      _count: { select: { rules: true } },
    },
  });

  return NextResponse.json({
    quizzes: quizzes.map(q => ({
      id: q.id,
      title: q.title,
      status: q.status,
      updatedAt: q.updatedAt,
      ruleCount: q._count.rules,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole);
    const body = CreateQuizSchema.parse(await req.json());

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        createdByTeacherId: userId,
        status: body.status ?? 'draft',
      },
      select: { id: true, title: true, status: true },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: error.errors }, { status: 400 });
    }
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
// EOF
