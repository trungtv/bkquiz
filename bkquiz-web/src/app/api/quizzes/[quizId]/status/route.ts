import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);
  const { quizId } = await ctx.params;
  const body = UpdateStatusSchema.parse(await req.json());

  try {
    await requireQuizOwnership(userId, quizId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'QUIZ_NOT_FOUND') {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: { status: body.status },
    select: { id: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, quiz: updated });
}


