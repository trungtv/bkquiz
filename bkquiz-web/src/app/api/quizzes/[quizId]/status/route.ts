import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId } = await requireUser();
  const { quizId } = await ctx.params;
  const body = UpdateStatusSchema.parse(await req.json());

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { classroomId: true, createdByTeacherId: true },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: quiz.classroomId, userId } },
    select: { roleInClass: true, status: true },
  });

  if (!membership || membership.status !== 'active' || (membership.roleInClass !== 'teacher' && membership.roleInClass !== 'ta')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: { status: body.status },
    select: { id: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, quiz: updated });
}


