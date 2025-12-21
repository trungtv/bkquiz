import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { StudentClassDetail } from './StudentClassDetail';
import { TeacherClassDetail } from './TeacherClassDetail';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; classId: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: 'Class Detail - BKquiz' };
}

export default async function ClassDetailPage(props: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await props.params;
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  // Verify user has access to this classroom
  const membership = await prisma.classMembership.findUnique({
    where: { classroomId_userId: { classroomId: classId, userId } },
    select: { status: true },
  });

  if (!membership || membership.status !== 'active') {
    return (
      <div className="py-5">
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-center text-danger">
          Bạn không có quyền truy cập lớp này.
        </div>
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <div className="py-5">
        <TeacherClassDetail classId={classId} />
      </div>
    );
  }

  return (
    <div className="py-5">
      <StudentClassDetail classId={classId} />
    </div>
  );
}

