import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacherInClassroom, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const CreateQuizSchema = z.object({
  classroomId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  status: z.enum(['draft', 'published']).optional(),
});

export async function GET(req: Request) {
  const { userId } = await requireUser();
  const url = new URL(req.url);
  const classroomId = url.searchParams.get('classroomId');

  if (!classroomId) {
    return NextResponse.json({ error: 'MISSING_CLASSROOM_ID' }, { status: 400 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
    select: { status: true },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { classroomId },
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
  const { userId } = await requireUser();
  const body = CreateQuizSchema.parse(await req.json());
  await requireTeacherInClassroom(userId, body.classroomId);

  const quiz = await prisma.quiz.create({
    data: {
      classroomId: body.classroomId,
      title: body.title,
      createdByTeacherId: userId,
      status: body.status ?? 'draft',
    },
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json(quiz);
}
// EOF
