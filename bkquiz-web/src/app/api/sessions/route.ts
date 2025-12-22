import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserRole, requireQuizOwnership, requireTeacherInClassroom, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { generateTotpSecret } from '@/server/totp';

const CreateSessionSchema = z.object({
  classroomId: z.string().trim().min(1),
  quizId: z.string().trim().min(1),
  totpStepSeconds: z.number().int().min(15).max(120).optional(),
  scheduledStartAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().min(60).max(86400).optional(), // 1 phút đến 24 giờ
});

export async function GET(_req: Request) {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  if (role === 'teacher') {
    // Teacher: lấy tất cả sessions của quizzes mà teacher sở hữu
    const sessions = await prisma.quizSession.findMany({
      where: {
        quiz: { createdByTeacherId: userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        quiz: s.quiz,
        attemptCount: s._count.attempts,
      })),
    });
  }

  // Student: lấy sessions từ các classes mà student đang tham gia
  // Bao gồm cả sessions chưa join và đã join
  const memberships = await prisma.classMembership.findMany({
    where: {
      userId,
      status: 'active',
    },
    select: {
      classroomId: true,
    },
  });

  const classroomIds = memberships.map(m => m.classroomId);

  if (classroomIds.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  // Lấy tất cả sessions từ các classes mà student đang tham gia
  const sessions = await prisma.quizSession.findMany({
    where: {
      classroomId: { in: classroomIds },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    take: 50,
  });

  // Lấy attempts của student cho các sessions này
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      sessionId: { in: sessions.map(s => s.id) },
    },
    select: {
      id: true,
      sessionId: true,
      status: true,
      submittedAt: true,
      score: true,
      createdAt: true,
    },
  });

  const attemptMap = new Map(attempts.map(a => [a.sessionId, a]));

  return NextResponse.json({
    sessions: sessions.map(s => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      createdAt: s.createdAt,
      quiz: s.quiz,
      attempt: attemptMap.get(s.id)
        ? {
            id: attemptMap.get(s.id)!.id,
            status: attemptMap.get(s.id)!.status,
            submittedAt: attemptMap.get(s.id)!.submittedAt,
            score: attemptMap.get(s.id)!.score,
            createdAt: attemptMap.get(s.id)!.createdAt,
          }
        : undefined,
    })),
  });
}

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const body = CreateSessionSchema.parse(await req.json());

  // Check teacher có trong classroom
  await requireTeacherInClassroom(userId, body.classroomId);

  // Check quiz tồn tại và teacher sở hữu quiz
  try {
    await requireQuizOwnership(userId, body.quizId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'QUIZ_NOT_FOUND') {
      return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: body.quizId },
    select: { id: true, _count: { select: { rules: true } } },
  });

  if (quiz._count.rules === 0) {
    return NextResponse.json({ error: 'QUIZ_HAS_NO_RULES' }, { status: 400 });
  }

  // Prepare session data
  const sessionData: any = {
      quizId: quiz.id,
      classroomId: body.classroomId,
      status: 'lobby',
      totpSecret: generateTotpSecret(),
      totpStepSeconds: body.totpStepSeconds ?? 45,
  };

  // If scheduledStartAt is provided, set startedAt (will be used when session actually starts)
  // Note: startedAt is used for both scheduled start and actual start
  // TODO: Consider adding a separate scheduledStartAt field in schema for better clarity
  if (body.scheduledStartAt) {
    sessionData.startedAt = new Date(body.scheduledStartAt);
  }

  // Store durationSeconds in settings JSONB
  if (body.durationSeconds) {
    sessionData.settings = { durationSeconds: body.durationSeconds };
  }

  const session = await prisma.quizSession.create({
    data: sessionData,
    select: { id: true, totpStepSeconds: true, status: true },
  });

  return NextResponse.json({ sessionId: session.id, totpStepSeconds: session.totpStepSeconds, status: session.status });
}
// EOF
