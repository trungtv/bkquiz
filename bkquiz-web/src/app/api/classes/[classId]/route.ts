import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: classId, userId } },
    select: {
      roleInClass: true,
      status: true,
      joinedAt: true,
      Classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
          createdAt: true,
          updatedAt: true,
          ownerTeacherId: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              ClassMembership: true,
            },
          },
        },
      },
    },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({
    id: membership.Classroom.id,
    name: membership.Classroom.name,
    classCode: membership.Classroom.classCode,
    createdAt: membership.Classroom.createdAt,
    updatedAt: membership.Classroom.updatedAt,
    ownerTeacherId: membership.Classroom.ownerTeacherId,
    ownerTeacher: membership.Classroom.User,
    memberCount: membership.Classroom._count.ClassMembership,
    userRole: membership.roleInClass,
    joinedAt: membership.joinedAt,
  });
}
