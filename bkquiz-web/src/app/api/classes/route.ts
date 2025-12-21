import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeacher, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { generateClassCode } from '@/utils/classCode';

const CreateClassSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET(_req: Request) {
  const { userId } = await requireUser();

  const memberships = await prisma.classMembership.findMany({
    where: { userId, status: 'active' },
    orderBy: { joinedAt: 'desc' },
    select: {
      roleInClass: true,
      joinedAt: true,
      Classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
          createdAt: true,
          ownerTeacherId: true,
          _count: {
            select: {
              ClassMembership: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    classes: memberships.map(m => ({
      id: m.Classroom.id,
      name: m.Classroom.name,
      classCode: m.Classroom.classCode,
      createdAt: m.Classroom.createdAt,
      ownerTeacherId: m.Classroom.ownerTeacherId,
      roleInClass: m.roleInClass,
      joinedAt: m.joinedAt,
      memberCount: m.Classroom._count.ClassMembership,
    })),
  });
}

export async function POST(req: Request) {
  const { userId, devRole } = await requireUser();
  await requireTeacher(userId, devRole as 'teacher' | 'student' | undefined);
  const body = CreateClassSchema.parse(await req.json());

  // Best effort unique classCode (low collision).
  let classCode = generateClassCode();
  for (let i = 0; i < 5; i += 1) {
    const exists = await prisma.classroom.findUnique({ where: { classCode } });
    if (!exists) {
      break;
    }
    classCode = generateClassCode();
  }

  const classroom = await prisma.classroom.create({
    data: {
      name: body.name,
      classCode,
      ownerTeacherId: userId,
      ClassMembership: {
        create: {
          userId,
          roleInClass: 'teacher',
          status: 'active',
        },
      },
    },
    select: {
      id: true,
      name: true,
      classCode: true,
    },
  });

  return NextResponse.json(classroom);
}
