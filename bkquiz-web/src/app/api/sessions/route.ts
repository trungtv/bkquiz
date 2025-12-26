import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserRole, requireQuizOwnership, requireTeacherInClassroom, requireUser } from '@/server/authz';
import { handleAuthorizationError } from '@/server/authzHelpers';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';
import { generateTotpSecret } from '@/server/totp';

const CreateSessionSchema = z.object({
  classroomId: z.string().trim().min(1),
  quizId: z.string().trim().min(1),
  sessionName: z.string().trim().min(1).optional(), // Tên session (mặc định là tên quiz)
  totpStepSeconds: z.number().int().min(15).max(120).optional(),
  // Accept datetime-local format (YYYY-MM-DDTHH:mm) or ISO datetime
  scheduledStartAt: z.string().refine((val) => {
    if (!val) {
      return true; // Optional
    }
    // Try to parse as Date - accepts both datetime-local and ISO formats
    const date = new Date(val);
    return !Number.isNaN(date.getTime());
  }, { message: 'Invalid datetime format' }).optional(),
  durationSeconds: z.number().int().min(60).max(86400).optional(), // 1 phút đến 24 giờ
  bufferMinutes: z.number().int().min(0).max(60).optional(), // Buffer time trước khi tự động đóng (0-60 phút)
  reviewDelayMinutes: z.number().int().min(0).max(1440).nullable().optional(), // Phút sau khi session kết thúc mới cho xem đáp án (null = không cho xem)
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
        settings: true,
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            classCode: true,
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
      sessions: sessions.map((s) => {
        const settings = s.settings as { sessionName?: string; durationSeconds?: number; scheduledStartAt?: string } | null;
        return {
          id: s.id,
          status: s.status,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          createdAt: s.createdAt,
          quiz: (s as any).quiz,
          attemptCount: (s as any)._count.attempts,
          sessionName: settings?.sessionName || null,
          durationSeconds: settings?.durationSeconds || null,
          scheduledStartAt: settings?.scheduledStartAt || null,
          classroom: (s as any).classroom,
        };
      }),
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
      settings: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
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
    sessions: sessions.map((s) => {
      const settings = s.settings as { sessionName?: string; durationSeconds?: number; scheduledStartAt?: string } | null;
      return {
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        quiz: (s as any).quiz,
        attempt: attemptMap.get(s.id)
          ? {
              id: attemptMap.get(s.id)!.id,
              status: attemptMap.get(s.id)!.status,
              submittedAt: attemptMap.get(s.id)!.submittedAt,
              score: attemptMap.get(s.id)!.score,
              createdAt: attemptMap.get(s.id)!.createdAt,
            }
          : undefined,
        sessionName: settings?.sessionName || null,
        durationSeconds: settings?.durationSeconds || null,
        scheduledStartAt: settings?.scheduledStartAt || null,
        classroom: (s as any).classroom,
      };
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = CreateSessionSchema.parse(await req.json());

    // Check teacher có trong classroom
    await requireTeacherInClassroom(userId, body.classroomId);

    // Check quiz tồn tại và teacher sở hữu quiz
    await requireQuizOwnership(userId, body.quizId);

    const quiz = await prisma.quiz.findUnique({
    where: { id: body.quizId },
    select: { id: true, _count: { select: { rules: true } } },
  });

  if (!quiz) {
    return NextResponse.json({ error: 'QUIZ_NOT_FOUND' }, { status: 404 });
  }

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

  // Store durationSeconds, sessionName, scheduledStartAt, and bufferMinutes in settings JSONB
  const settings: any = {};
  if (body.durationSeconds) {
    settings.durationSeconds = body.durationSeconds;
  }
  if (body.sessionName) {
    settings.sessionName = body.sessionName;
  }
  // Store scheduledStartAt in settings to distinguish from actual start time
  if (body.scheduledStartAt) {
    settings.scheduledStartAt = body.scheduledStartAt;
    // Also set startedAt for backward compatibility and actual start tracking
    sessionData.startedAt = new Date(body.scheduledStartAt);
  }
  // Store bufferMinutes for auto-end (default 5 minutes if not specified)
  if (body.bufferMinutes !== undefined) {
    settings.bufferMinutes = body.bufferMinutes;
  } else if (body.durationSeconds) {
    // Default buffer is 5 minutes if duration is set but buffer not specified
    settings.bufferMinutes = 5;
  }
  // Store reviewDelayMinutes (null = không cho xem, số = phút sau khi session kết thúc)
  if (body.reviewDelayMinutes !== undefined) {
    settings.reviewDelayMinutes = body.reviewDelayMinutes;
  }
  if (Object.keys(settings).length > 0) {
    sessionData.settings = settings;
  }

  const session = await prisma.quizSession.create({
    data: sessionData,
    select: { id: true, totpStepSeconds: true, status: true },
  });

  // Build session snapshot (questions from quiz rules) immediately after creation
  try {
    await buildSessionSnapshotIfNeeded(session.id);
  } catch (err) {
    console.error(`Error building snapshot for session ${session.id}:`, err);
    // Continue even if snapshot build fails - it can be built later when needed
    // But log the error so we know there's an issue
  }

    return NextResponse.json({ sessionId: session.id, totpStepSeconds: session.totpStepSeconds, status: session.status });
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
