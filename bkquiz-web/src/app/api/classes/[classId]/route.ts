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
      classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
          createdAt: true,
          updatedAt: true,
          ownerTeacherId: true,
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
      },
    },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({
    id: membership.classroom.id,
    name: membership.classroom.name,
    classCode: membership.classroom.classCode,
    createdAt: membership.classroom.createdAt,
    updatedAt: membership.classroom.updatedAt,
    ownerTeacherId: membership.classroom.ownerTeacherId,
    ownerTeacher: membership.classroom.ownerTeacher,
    memberCount: membership.classroom._count.memberships,
    userRole: membership.roleInClass,
    joinedAt: membership.joinedAt,
  });
}