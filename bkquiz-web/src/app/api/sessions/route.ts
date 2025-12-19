import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacherInClassroom, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { generateTotpSecret } from '@/server/totp';

const CreateSessionSchema = z.object({
  classroomId: z.string().trim().min(1),
  quizId: z.string().trim().min(1),
  totpStepSeconds: z.number().int().min(15).max(120).optional(),
});

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
