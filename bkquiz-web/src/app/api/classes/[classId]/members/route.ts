import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  // Check user has access to this classroom
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: classId, userId } },
    select: { status: true },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const members = await prisma.classMembership.findMany({
    where: { classroomId: classId, status: 'active' },
    orderBy: [
      { roleInClass: 'asc' }, // teacher, ta, student
      { joinedAt: 'asc' },
    ],
    select: {
      userId: true,
      roleInClass: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    members: members.map(m => ({
      userId: m.userId,
      user: m.user,
      roleInClass: m.roleInClass,
      joinedAt: m.joinedAt,
    })),
  });
}

