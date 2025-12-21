import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserRole, requireTeacherInClassroom, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { generateTotpSecret } from '@/server/totp';

const CreateSessionSchema = z.object({
  classroomId: z.string().trim().min(1),
  quizId: z.string().trim().min(1),
  totpStepSeconds: z.number().int().min(15).max(120).optional(),
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
  const quiz = await prisma.quiz.findUnique({
    where: { id: body.quizId },
    select: { id: true, createdByTeacherId: true, _count: { select: { rules: true } } },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

  // Chỉ teacher sở hữu quiz mới được tạo session
  if (quiz.createdByTeacherId !== userId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (quiz._count.rules === 0) {
    return NextResponse.json({ error: 'QUIZ_HAS_NO_RULES' }, { status: 400 });
  }

  const session = await prisma.quizSession.create({
    data: {
      quizId: quiz.id,
      classroomId: body.classroomId,
      status: 'lobby',
      totpSecret: generateTotpSecret(),
      totpStepSeconds: body.totpStepSeconds ?? 45,
    },
    select: { id: true, totpStepSeconds: true, status: true },
  });

  return NextResponse.json({ sessionId: session.id, totpStepSeconds: session.totpStepSeconds, status: session.status });
}
// EOF
