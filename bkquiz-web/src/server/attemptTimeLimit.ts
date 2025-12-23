import { prisma } from '@/server/prisma';

type AttemptWithSession = {
  attemptStartedAt: Date | null;
  quizSession: {
    startedAt: Date | null;
    settings: unknown;
  };
};

/**
 * Tính toán thời gian kết thúc của attempt
 * Logic:
 * - attemptEndTime = attemptStartedAt + durationSeconds
 * - sessionEndTime = session.startedAt + durationSeconds + bufferMinutes
 * - actualEndTime = min(attemptEndTime, sessionEndTime)
 */
export function calculateAttemptEndTime(
  attempt: AttemptWithSession,
): Date | null {
  if (!attempt.attemptStartedAt || !attempt.quizSession.startedAt) {
    return null; // Chưa bắt đầu hoặc session chưa start
  }

  const settings = attempt.quizSession.settings as {
    durationSeconds?: number;
    bufferMinutes?: number;
  } | null;

  const durationSeconds = settings?.durationSeconds;
  if (!durationSeconds) {
    return null; // Không có time limit
  }

  // Thời gian kết thúc của attempt (từ lúc bắt đầu làm bài)
  const attemptEndTime = new Date(
    attempt.attemptStartedAt.getTime() + durationSeconds * 1000,
  );

  // Thời gian kết thúc của session (bao gồm buffer)
  const bufferMinutes = settings?.bufferMinutes ?? 5;
  const sessionEndTime = new Date(
    attempt.quizSession.startedAt.getTime() + durationSeconds * 1000 + bufferMinutes * 60 * 1000,
  );

  // Lấy thời gian sớm hơn (strict enforcement)
  return attemptEndTime < sessionEndTime ? attemptEndTime : sessionEndTime;
}

/**
 * Validate xem attempt còn trong thời gian cho phép không
 * Returns: { valid: boolean, timeRemaining: number | null, isTimeUp: boolean }
 */
export async function validateAttemptTimeLimit(
  attemptId: string,
): Promise<{ valid: boolean; timeRemaining: number | null; isTimeUp: boolean; attemptEndTime: Date | null }> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      attemptStartedAt: true,
      status: true,
      quizSession: {
        select: {
          startedAt: true,
          settings: true,
        },
      },
    },
  });

  if (!attempt) {
    return { valid: false, timeRemaining: null, isTimeUp: true, attemptEndTime: null };
  }

  // Nếu đã submit rồi, không cần check
  if (attempt.status === 'submitted') {
    return { valid: true, timeRemaining: null, isTimeUp: false, attemptEndTime: null };
  }

  // Nếu chưa bắt đầu làm bài, cho phép
  if (!attempt.attemptStartedAt) {
    return { valid: true, timeRemaining: null, isTimeUp: false, attemptEndTime: null };
  }

  const attemptEndTime = calculateAttemptEndTime(attempt);
  if (!attemptEndTime) {
    return { valid: true, timeRemaining: null, isTimeUp: false, attemptEndTime: null };
  }

  const now = new Date();
  const timeRemaining = Math.max(0, Math.floor((attemptEndTime.getTime() - now.getTime()) / 1000));
  const isTimeUp = now >= attemptEndTime;

  return {
    valid: !isTimeUp,
    timeRemaining,
    isTimeUp,
    attemptEndTime,
  };
}
