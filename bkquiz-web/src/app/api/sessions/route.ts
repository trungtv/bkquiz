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

export async function GET(req: Request) {
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

  // Student: lấy sessions mà student đã tham gia (có attempt)
  // Note: Vì QuizSession không có classroomId, không thể query sessions từ classes
  // Student nên xem sessions từ class detail page để có context rõ ràng
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      score: true,
      createdAt: true,
      session: {
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
      },
    },
    take: 50,
  });

  return NextResponse.json({
    sessions: attempts.map(a => ({
      id: a.session.id,
      status: a.session.status,
      startedAt: a.session.startedAt,
      endedAt: a.session.endedAt,
      createdAt: a.session.createdAt,
      quiz: a.session.quiz,
      attempt: {
        id: a.id,
        status: a.status,
        submittedAt: a.submittedAt,
        score: a.score,
        createdAt: a.createdAt,
      },
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
      status: 'lobby',
      totpSecret: generateTotpSecret(),
      totpStepSeconds: body.totpStepSeconds ?? 45,
    },
    select: { id: true, totpStepSeconds: true, status: true },
  });

  return NextResponse.json({ sessionId: session.id, totpStepSeconds: session.totpStepSeconds, status: session.status });
}
// EOF
