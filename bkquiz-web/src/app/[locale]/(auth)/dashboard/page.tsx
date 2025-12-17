import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { ClassroomPanel } from './ClassroomPanel';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Dashboard',
  });

  return {
    title: t('meta_title'),
  };
}

export default async function Dashboard() {
  const { userId } = await requireUser();

  const initial = [];
  const rows = await prisma.classMembership.findMany({
    where: { userId, status: 'active' },
    include: { classroom: true },
    orderBy: { joinedAt: 'desc' },
  });

  for (const r of rows) {
    initial.push({
      id: r.classroom.id,
      name: r.classroom.name,
      classCode: r.classroom.classCode,
    });
  }

  return (
    <div className="py-5 [&_p]:my-6">
      <ClassroomPanel initial={initial} />
    </div>
  );
}
