import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

type RuleFilters = { poolIds?: string[] };
type VariantSettings = { defaultExtraPercent?: number; perTagExtraPercent?: Record<string, number> };
type QuizSettings = { variant?: VariantSettings };

export async function GET(_: Request, ctx: { params: Promise<{ quizId: string }> }) {
  const { userId } = await requireUser();
  const { quizId } = await ctx.params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      classroomId: true,
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

  const settings = (quiz.settings ?? {}) as QuizSettings;
  const variant = (settings.variant ?? {}) as VariantSettings;
  const defaultExtraPercent = typeof variant.defaultExtraPercent === 'number' ? variant.defaultExtraPercent : 0.2;
  const perTagExtraPercent = variant.perTagExtraPercent ?? {};

  const rows = [];
  for (const rule of quiz.rules) {
    const filters = (rule.filters ?? {}) as RuleFilters;
    const poolIds = (filters.poolIds ?? []).filter(Boolean);

    const requestedBase = (rule.count ?? 0) || ((rule.commonCount ?? 0) + (rule.variantCount ?? 0));
    const tagExtra = typeof perTagExtraPercent[rule.tag.normalizedName] === 'number' ? perTagExtraPercent[rule.tag.normalizedName] : undefined;
    const extraPercent = typeof rule.extraPercent === 'number' ? rule.extraPercent : (typeof tagExtra === 'number' ? tagExtra : defaultExtraPercent);
    const poolSize = Math.ceil(requestedBase * (1 + extraPercent));

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
