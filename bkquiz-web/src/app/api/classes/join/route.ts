import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

const JoinClassSchema = z.object({
  classCode: z.string().trim().min(4).max(32),
});

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const body = JoinClassSchema.parse(await req.json());

  const classroom = await prisma.classroom.findUnique({
    where: { classCode: body.classCode.toUpperCase() },
    select: { id: true, name: true, classCode: true },
  });

  if (!classroom) {
    return NextResponse.json({ error: 'CLASS_NOT_FOUND' }, { status: 404 });
  }

  await prisma.classMembership.upsert({
    where: {
      classroomId_userId: { classroomId: classroom.id, userId },
    },
    update: {
      status: 'active',
    },
    create: {
      classroomId: classroom.id,
      userId,
      roleInClass: 'student',
      status: 'active',
    },
  });

  return NextResponse.json(classroom);
}
