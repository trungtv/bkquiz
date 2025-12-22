import { NextResponse } from 'next/server';
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

type AnswerRow = Awaited<ReturnType<typeof prisma.answer.findMany>>[number];
type SnapshotRow = {
  id: string;
  type: 'mcq_single' | 'mcq_multi';
  options: Array<{ order: number; isCorrect: boolean }>;
};

type ScoringSettings = {
  mode?: 'all_or_nothing' | 'partial' | 'penalty';
  partialCreditMethod?: 'edc' | 'halves';
  penaltyPerWrongOption?: number;
  rounding?: 'none' | 'round_2';
};

function normalizeSelected(x: unknown) {
  const arr = Array.isArray(x) ? x : [];
  return Array.from(new Set(arr.filter(n => Number.isInteger(n)).map(n => Number(n)))).sort((a, b) => a - b);
}

function roundScore(score: number, rounding: ScoringSettings['rounding']) {
  if (rounding === 'round_2') {
    return Math.round(score * 100) / 100;
  }
  return score;
}

function computeAllOrNothing(selected: number[], correct: number[]) {
  const ok = selected.length === correct.length && selected.every((v, i) => v === correct[i]);
  return ok ? 1 : 0;
}

function computeEDC(selected: number[], correct: Set<number>, optionCount: number) {
  // Every Decision Counts: mỗi option là 1 decision (select / not select)
  // decision đúng = chọn đúng option đúng OR không chọn option sai
  if (optionCount <= 0) {
    return 0;
  }
  let correctDecisions = 0;
  for (let order = 0; order < optionCount; order += 1) {
    const isCorrect = correct.has(order);
    const isSelected = selected.includes(order);
    const decisionOk = (isCorrect && isSelected) || (!isCorrect && !isSelected);
    if (decisionOk) {
      correctDecisions += 1;
    }
  }
  return correctDecisions / optionCount;
}

function computeByHalves(selected: number[], correct: Set<number>, optionCount: number) {
  // By Halves: mỗi lỗi -> nửa điểm còn lại. >=3 lỗi => 0.
  // Lỗi = chọn option sai OR bỏ sót option đúng.
  let errors = 0;
  for (let order = 0; order < optionCount; order += 1) {
    const isCorrect = correct.has(order);
    const isSelected = selected.includes(order);
    if ((isCorrect && !isSelected) || (!isCorrect && isSelected)) {
      errors += 1;
    }
  }
  if (errors === 0) {
    return 1;
  }
  if (errors === 1) {
    return 0.5;
  }
  if (errors === 2) {
    return 0.25;
  }
  return 0;
}

function computePenalty(selected: number[], correct: Set<number>, optionCount: number, penaltyPerWrongOption: number) {
  // Penalty: đúng được 1, mỗi lựa chọn sai bị trừ penaltyPerWrongOption; không âm.
  // Với multi-select: penalize chọn sai; không penalize bỏ sót (giữ đơn giản MVP).
  const hasAnyCorrect = selected.some(o => correct.has(o));
  const base = hasAnyCorrect ? 1 : 0;
  const wrong = selected.filter(o => !correct.has(o) && o >= 0 && o < optionCount).length;
  return Math.max(0, base - wrong * penaltyPerWrongOption);
}

export async function POST(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  try {
    await requireAttemptAccess(userId, attemptId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      sessionId: true,
      quizSession: { select: { quiz: { select: { settings: true } } } },
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }
  if (attempt.status !== 'active') {
    return NextResponse.json({ error: 'ATTEMPT_NOT_ACTIVE' }, { status: 400 });
  }

  const snapshots = await prisma.sessionQuestionSnapshot.findMany({
    where: { sessionId: attempt.sessionId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      type: true,
      options: { select: { order: true, isCorrect: true } },
    },
  });

  const answers = await prisma.answer.findMany({
    where: { attemptId },
    select: { sessionQuestionId: true, selected: true },
  });
  const answerByQ = new Map((answers as AnswerRow[]).map(a => [a.sessionQuestionId, a.selected]));

  const scoring = ((attempt.quizSession.quiz.settings as any)?.scoring ?? {}) as ScoringSettings;
  const mode = scoring.mode ?? 'all_or_nothing';
  const rounding = scoring.rounding ?? 'round_2';
  const partialMethod = scoring.partialCreditMethod ?? 'edc';
  const penaltyPerWrongOption = typeof scoring.penaltyPerWrongOption === 'number' ? scoring.penaltyPerWrongOption : 0.25;

  let score = 0;
  let correctCount = 0;
  for (const q of (snapshots as unknown as SnapshotRow[])) {
    const optionCount = q.options.length;
    const correctOrders = q.options
      .filter((o: { order: number; isCorrect: boolean }) => o.isCorrect)
      .map((o: { order: number }) => o.order)
      .sort((a: number, b: number) => a - b);
    const correctSet = new Set<number>(correctOrders as number[]);
    const selected = normalizeSelected(answerByQ.get(q.id));

    const ok = selected.length === correctOrders.length && selected.every((v, i) => v === correctOrders[i]);
    if (ok) {
      correctCount += 1;
    }

    let qScore = 0;
    if (mode === 'all_or_nothing') {
      qScore = computeAllOrNothing(selected, correctOrders);
    } else if (mode === 'partial') {
      qScore = partialMethod === 'halves'
        ? computeByHalves(selected, correctSet, optionCount)
        : computeEDC(selected, correctSet, optionCount);
    } else {
      qScore = computePenalty(selected, correctSet, optionCount, penaltyPerWrongOption);
    }

    score += qScore;
  }

  const updated = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      score: roundScore(score, rounding),
    },
    select: { id: true, status: true, submittedAt: true, score: true },
  });

  return NextResponse.json({
    ok: true,
    totalQuestions: snapshots.length,
    correctCount,
    scoring: { mode, partialMethod: mode === 'partial' ? partialMethod : undefined, rounding },
    ...updated,
  });
}
// EOF
