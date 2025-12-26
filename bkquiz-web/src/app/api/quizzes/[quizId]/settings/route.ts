import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';

type VariantSettings = {
  defaultExtraPercent?: number;
  perTagExtraPercent?: Record<string, number>;
};

type QuizSettings = {
  durationSeconds?: number;
  variant?: VariantSettings;
};

const PatchSettingsSchema = z.object({
  durationSeconds: z.number().int().min(60).max(86400).optional(), // 1 phút đến 24 giờ
  variant: z.object({
    defaultExtraPercent: z.number().min(0).max(5).optional(),
  }).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    await requireQuizOwnership(userId, quizId);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, settings: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }

    const settings = (quiz.settings ?? {}) as QuizSettings;
    const variant = (settings.variant ?? {}) as VariantSettings;
    return NextResponse.json({
      quizId: quiz.id,
      durationSeconds: typeof settings.durationSeconds === 'number' ? settings.durationSeconds : null,
      variant: {
        defaultExtraPercent: typeof variant.defaultExtraPercent === 'number' ? variant.defaultExtraPercent : 0.2,
        perTagExtraPercent: variant.perTagExtraPercent ?? {},
      },
    });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    const body = PatchSettingsSchema.parse(await req.json());
    await requireQuizOwnership(userId, quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, settings: true },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

  const settings = (quiz.settings ?? {}) as QuizSettings;
  const next: QuizSettings = { ...settings };
  next.variant = { ...(settings.variant ?? {}) };

  if (body.durationSeconds !== undefined) {
    next.durationSeconds = body.durationSeconds;
  }

  if (body.variant && typeof body.variant.defaultExtraPercent === 'number') {
    next.variant.defaultExtraPercent = body.variant.defaultExtraPercent;
  }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: { settings: next as unknown as any },
      select: { id: true, settings: true },
    });

    return NextResponse.json({ ok: true, quizId: updated.id, settings: updated.settings });
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

// EOF
