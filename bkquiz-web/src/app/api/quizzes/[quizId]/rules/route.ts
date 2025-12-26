import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

const UpsertRuleSchema = z.object({
  tag: z.string().trim().min(1),
  mode: z.enum(['same', 'variant']).default('same'),
  count: z.number().int().min(1).max(500).optional(),
  commonCount: z.number().int().min(0).max(500).optional(),
  variantCount: z.number().int().min(0).max(500).optional(),
  extraPercent: z.number().min(0).max(5).optional(),
  poolIds: z.array(z.string().trim().min(1)).optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    await requireQuizOwnership(userId, quizId);

    const rules = await prisma.quizRule.findMany({
      where: { quizId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        count: true,
        commonCount: true,
        variantCount: true,
        extraPercent: true,
        filters: true,
        tag: { select: { id: true, name: true, normalizedName: true } },
      },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    const body = UpsertRuleSchema.parse(await req.json());

    await requireQuizOwnership(userId, quizId);

    const normalized = normalizeTagName(body.tag);
    let tag;
    try {
      tag = await prisma.tag.upsert({
        where: { normalizedName: normalized },
        update: { name: body.tag },
        create: { name: body.tag, normalizedName: normalized },
        select: { id: true },
      });
    } catch (error) {
      console.error('Error upserting tag:', error);
      return NextResponse.json({ error: 'TAG_CREATE_FAILED' }, { status: 500 });
    }

    // For MVP: one rule per (quiz, tag)
    const existing = await prisma.quizRule.findFirst({
      where: { quizId, tagId: tag.id },
      select: { id: true },
    });

    const filters = { poolIds: body.poolIds ?? [] };

    const safeCount = body.count ?? 0;
    const safeCommon = body.commonCount ?? 0;
    const safeVariant = body.variantCount ?? 0;
    const safeExtra = body.extraPercent;
    if (body.mode === 'same' && safeCount < 1) {
      return NextResponse.json({ error: 'INVALID_COUNT' }, { status: 400 });
    }
    if (body.mode === 'variant' && safeCommon + safeVariant < 1) {
      return NextResponse.json({ error: 'INVALID_COMMON_VARIANT' }, { status: 400 });
    }

    const rule = existing
      ? await prisma.quizRule.update({
          where: { id: existing.id },
          data: body.mode === 'same'
            ? {
                count: safeCount,
                commonCount: null,
                variantCount: null,
                extraPercent: null,
                filters,
              }
            : {
                count: null,
                commonCount: safeCommon,
                variantCount: safeVariant,
                extraPercent: typeof safeExtra === 'number' ? safeExtra : null,
                filters,
              },
          select: { id: true, count: true, commonCount: true, variantCount: true, extraPercent: true, filters: true },
        })
      : await prisma.quizRule.create({
          data: body.mode === 'same'
            ? {
                quizId,
                tagId: tag.id,
                count: safeCount,
                commonCount: null,
                variantCount: null,
                extraPercent: null,
                filters,
              }
            : {
                quizId,
                tagId: tag.id,
                count: null,
                commonCount: safeCommon,
                variantCount: safeVariant,
                extraPercent: typeof safeExtra === 'number' ? safeExtra : null,
                filters,
              },
          select: { id: true, count: true, commonCount: true, variantCount: true, extraPercent: true, filters: true },
        });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: error.issues }, { status: 400 });
    }
    console.error('Error creating/updating quiz rule:', error);
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, devRole } = await requireUser();
    await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
    const { quizId } = await ctx.params;
    const url = new URL(req.url);
    const ruleId = url.searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json({ error: 'MISSING_RULE_ID' }, { status: 400 });
    }

    await requireQuizOwnership(userId, quizId);

    await prisma.quizRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    throw error;
  }
}
// EOF
