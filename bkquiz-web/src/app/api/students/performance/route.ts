import { NextResponse } from 'next/server';
import { requireStudent, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET() {
  const { userId, devRole } = await requireUser();
  await requireStudent(userId, devRole as 'teacher' | 'student' | undefined);

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'submitted',
      score: { not: null },
    },
    select: {
      id: true,
      score: true,
      submittedAt: true,
      quizSession: {
        select: {
          quiz: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 100, // Limit để tính stats
  });

  if (attempts.length === 0) {
    return NextResponse.json({
      totalAttempts: 0,
      averageScore: null,
      highestScore: null,
      recentAttempts: [],
    });
  }

  const scores = attempts.map(a => a.score!).filter((s): s is number => s !== null);
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;
  const highestScore = scores.length > 0 ? Math.max(...scores) : null;

  const recentAttempts = attempts.slice(0, 5).map(a => ({
    id: a.id,
    score: a.score,
    submittedAt: a.submittedAt,
    quizTitle: a.quizSession.quiz.title,
  }));

  return NextResponse.json({
    totalAttempts: attempts.length,
    averageScore: averageScore ? Number(averageScore.toFixed(2)) : null,
    highestScore: highestScore ? Number(highestScore.toFixed(2)) : null,
    recentAttempts,
  });
}

