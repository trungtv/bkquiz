import { NextResponse } from 'next/server';
import { requireQuizOwnership, requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

type RuleFilters = { poolIds?: string[] };
type VariantSettings = { defaultExtraPercent?: number; perTagExtraPercent?: Record<string, number> };
type QuizSettings = { variant?: VariantSettings };

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole);
  const { quizId } = await ctx.params;

  try {
    await requireQuizOwnership(userId, quizId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'QUIZ_NOT_FOUND') {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      settings: true,
      rules: {
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
      },
    },
  });

  const settings = (quiz.settings ?? {}) as QuizSettings;
  const variant = (settings.variant ?? {}) as VariantSettings;
  const defaultExtraPercent = typeof variant.defaultExtraPercent === 'number' ? variant.defaultExtraPercent : 0.2;
  const perTagExtraPercent = variant.perTagExtraPercent ?? {};

  const rows = [];
  for (const rule of quiz.rules) {
    const filters = (rule.filters ?? {}) as RuleFilters;
    const poolIds = (filters.poolIds ?? []).filter(Boolean);

    const requestedBase = (rule.count ?? 0) || ((rule.commonCount ?? 0) + (rule.variantCount ?? 0));
    const isVariantSet = (rule.commonCount ?? 0) > 0 || (rule.variantCount ?? 0) > 0;
    // Chỉ áp dụng extraPercent cho variant-set (same-set không cần dự phòng)
    const poolSize = isVariantSet
      ? (() => {
          const tagExtra = typeof perTagExtraPercent[rule.tag.normalizedName] === 'number' ? perTagExtraPercent[rule.tag.normalizedName] : undefined;
          const extraPercent = typeof rule.extraPercent === 'number' ? rule.extraPercent : (typeof tagExtra === 'number' ? tagExtra : defaultExtraPercent);
          return Math.ceil(requestedBase * (1 + extraPercent));
        })()
      : requestedBase;

    const available = await prisma.question.count({
      where: {
        deletedAt: null,
        ...(poolIds.length ? { poolId: { in: poolIds } } : {}),
        tags: { some: { tagId: rule.tag.id } },
      },
    });

    rows.push({
      ruleId: rule.id,
      tagId: rule.tag.id,
      tag: { name: rule.tag.name, normalizedName: rule.tag.normalizedName },
      requested: requestedBase,
      poolSize,
      available,
      shortage: Math.max(0, poolSize - available),
      poolIds,
    });
  }

  const totalRequested = rows.reduce((s: number, r: any) => s + r.requested, 0);
  const totalPoolSize = rows.reduce((s: number, r: any) => s + r.poolSize, 0);
  const totalShortage = rows.reduce((s: number, r: any) => s + r.shortage, 0);

  return NextResponse.json({
    quiz: { id: quiz.id, title: quiz.title },
    totals: { totalRequested, totalPoolSize, totalShortage },
    rows,
  });
}
// EOF
