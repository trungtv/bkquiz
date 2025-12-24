import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classCode = searchParams.get('classCode');

  if (!classCode || classCode.trim().length < 4) {
    return NextResponse.json({ error: 'INVALID_CLASS_CODE' }, { status: 400 });
  }

  const classroom = await prisma.classroom.findUnique({
    where: { classCode: classCode.toUpperCase().trim() },
    select: {
      id: true,
      name: true,
      classCode: true,
      createdAt: true,
      ownerTeacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          memberships: true,
        },
      },
    },
  });

  if (!classroom) {
    return NextResponse.json({ error: 'CLASS_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    id: classroom.id,
    name: classroom.name,
    classCode: classroom.classCode,
    createdAt: classroom.createdAt,
    ownerTeacher: classroom.ownerTeacher,
    memberCount: classroom._count.memberships,
  });
}
