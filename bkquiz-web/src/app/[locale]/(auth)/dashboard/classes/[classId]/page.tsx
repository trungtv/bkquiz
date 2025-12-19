import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { ClassDetailPanel } from './ClassDetailPanel';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; classId: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: 'Class Detail - BKquiz' };
}

export default async function ClassDetailPage(props: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await props.params;
  const { userId } = await requireUser();

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

  return (
    <div className="py-5">
      <ClassDetailPanel classId={classId} />
    </div>
  );
}

