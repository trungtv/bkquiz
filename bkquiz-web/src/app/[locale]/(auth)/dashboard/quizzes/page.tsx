import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { QuizzesPanel } from './QuizzesPanel';

type ClassroomRow = {
  classroom: { id: string; name: string; classCode: string };
  roleInClass: 'student' | 'ta' | 'teacher';
};

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Quizzes' });
  return { title: t('meta_title') };
}

export default async function QuizzesPage() {
  const { userId } = await requireUser();

  const classrooms: ClassroomRow[] = await prisma.classMembership.findMany({
    where: { userId, status: 'active' },
    orderBy: { joinedAt: 'desc' },
    select: {
      roleInClass: true,
      classroom: { select: { id: true, name: true, classCode: true } },
    },
  });

  return (
    <div className="py-5">
      <QuizzesPanel classrooms={classrooms.map((r: ClassroomRow) => ({ ...r.classroom, roleInClass: r.roleInClass }))} />
    </div>
  );
}
// EOF
