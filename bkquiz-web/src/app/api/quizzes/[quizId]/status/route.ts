import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    const body = UpdateStatusSchema.parse(await req.json());
    await requireQuizOwnership(userId, quizId);

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: { status: body.status },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, quiz: updated });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: error.issues }, { status: 400 });
    }
    throw error;
  }
}


