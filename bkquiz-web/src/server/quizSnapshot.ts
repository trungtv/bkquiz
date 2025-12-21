import { prisma } from '@/server/prisma';

type RuleFilters = { poolIds?: string[] };
type SnapshotSourceOption = { content: string; isCorrect: boolean; order: number };
type SnapshotSourceQuestion = { id: string; type: 'mcq_single' | 'mcq_multi'; prompt: string; options: SnapshotSourceOption[] };
type VariantSettings = { defaultExtraPercent?: number; perTagExtraPercent?: Record<string, number> };
type QuizSettings = { variant?: VariantSettings };

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function hashToUint32(input: string) {
  // FNV-1a 32-bit
  let h = 0x811C9DC5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
}

export async function buildSessionSnapshotIfNeeded(sessionId: string) {
  const existingCount = await prisma.sessionQuestionSnapshot.count({
    where: { sessionId },
  });
  if (existingCount > 0) {
    return {
      alreadyBuilt: true,
      totalPicked: existingCount,
      perRule: [] as Array<{ tagId: string; tagNormalizedName: string; requested: number; picked: number }>,
    };
  }

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      Quiz: {
        select: {
          id: true,
          settings: true,
          rules: {
            select: {
              id: true,
              count: true,
              commonCount: true,
              variantCount: true,
              extraPercent: true,
              filters: true,
              tag: { select: { id: true, normalizedName: true } },
            },
          },
        },
      },
    },
  });
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  // Build same-set/variant-set by rules: for each tag, select N questions into session pool (snapshot)
  const pickedQuestionIds: string[] = [];
  const perRule: Array<{ tagId: string; tagNormalizedName: string; requested: number; picked: number; poolSize: number }> = [];
  const settings = (session.Quiz.settings ?? {}) as QuizSettings;
  const variant = (settings.variant ?? {}) as VariantSettings;
  const defaultExtraPercent = typeof variant.defaultExtraPercent === 'number' ? variant.defaultExtraPercent : 0.2;
  const perTagExtraPercent = variant.perTagExtraPercent ?? {};

  for (const rule of session.Quiz.rules) {
    const filters = (rule.filters ?? {}) as RuleFilters;
    const poolIds = uniq(filters.poolIds ?? []);

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

    // If poolIds empty => allow all pools.
    const rows = await prisma.question.findMany({
      where: {
        deletedAt: null,
        ...(poolIds.length ? { poolId: { in: poolIds } } : {}),
        tags: { some: { tagId: rule.tag.id } },
      },
      orderBy: [{ createdAt: 'desc' }],
      // Take a bounded superset so seeded shuffle has variety but stays fast.
      take: Math.min(2000, Math.max(poolSize * 8, poolSize)),
      select: {
        id: true,
      },
    });

    const candidateIds = rows.map((r: { id: string }) => r.id);
    const rand = mulberry32(hashToUint32(`${sessionId}:${rule.tag.id}`));
    shuffleInPlace(candidateIds, rand);

    let need = poolSize;
    let picked = 0;
    for (const id of candidateIds) {
      if (need <= 0) {
        break;
      }
      if (!pickedQuestionIds.includes(id)) {
        pickedQuestionIds.push(id);
        need -= 1;
        picked += 1;
      }
    }
    perRule.push({ tagId: rule.tag.id, tagNormalizedName: rule.tag.normalizedName, requested: requestedBase, picked, poolSize });
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: pickedQuestionIds } },
    select: {
      id: true,
      type: true,
      prompt: true,
      options: { where: { deletedAt: null }, orderBy: { order: 'asc' }, select: { content: true, isCorrect: true, order: true } },
    },
  });

  // Preserve picked order
  const typedQuestions = questions as unknown as SnapshotSourceQuestion[];
  const byId = new Map(typedQuestions.map(q => [q.id, q]));
  const ordered = pickedQuestionIds.map(id => byId.get(id)).filter(Boolean) as SnapshotSourceQuestion[];

  await prisma.$transaction(async (tx) => {
    let order = 0;
    for (const q of ordered) {
      const snap = await tx.sessionQuestionSnapshot.create({
        data: {
          sessionId,
          sourceQuestionId: q.id,
          tagId: null,
          type: q.type,
          prompt: q.prompt,
          order,
          options: {
            create: q.options.map(o => ({
              order: o.order,
              content: o.content,
              isCorrect: o.isCorrect,
            })),
          },
        },
        select: { id: true },
      });
      void snap;
      order += 1;
    }
  });

  // NOTE: tagId will be backfilled below in a second pass (based on rules) for filtering during variant assignment.
  // We do it in a single query per tag for MVP simplicity.
  for (const r of perRule) {
    const questionIdsForTag = await prisma.questionTag.findMany({
      where: { tagId: r.tagId, questionId: { in: pickedQuestionIds } },
      select: { questionId: true },
    });
    const ids = questionIdsForTag.map((x: { questionId: string }) => x.questionId);
    await prisma.sessionQuestionSnapshot.updateMany({
      where: { sessionId, sourceQuestionId: { in: ids } },
      data: { tagId: r.tagId },
    });
  }

  // Variant-set common set (session-level): for each tag, pick commonCount questions deterministically
  // so all students share the same "common" part.
  const commonByTag = new Map<string, number>();
  for (const rule of session.Quiz.rules) {
    const c = rule.commonCount ?? 0;
    if (c > 0) {
      commonByTag.set(rule.tag.id, Math.max(commonByTag.get(rule.tag.id) ?? 0, c));
    }
  }
  for (const [tagId, commonCount] of commonByTag.entries()) {
    const pool = await prisma.sessionQuestionSnapshot.findMany({
      where: { sessionId, tagId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    const ids = pool.map((x: { id: string }) => x.id);
    const rand = mulberry32(hashToUint32(`${sessionId}:common:${tagId}`));
    shuffleInPlace(ids, rand);
    const chosen = ids.slice(0, commonCount);
    if (chosen.length > 0) {
      await prisma.$transaction(chosen.map((sessionQuestionId: string, order: number) => prisma.sessionCommonQuestion.create({
        data: { sessionId, tagId, sessionQuestionId, order },
      })));
    }
  }

  return { alreadyBuilt: false, totalPicked: pickedQuestionIds.length, perRule };
}
// EOF
