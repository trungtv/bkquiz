import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { QuizzesPanel } from './QuizzesPanel';

type ClassroomRow = {
  Classroom: { id: string; name: string; classCode: string };
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
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole);

  if (role !== 'teacher') {
    redirect('/dashboard');
  }

  const classrooms: ClassroomRow[] = await prisma.classMembership.findMany({
    where: { userId, status: 'active' },
    orderBy: { joinedAt: 'desc' },
    select: {
      roleInClass: true,
      Classroom: {
        select: {
          id: true,
          name: true,
          classCode: true,
        },
      },
    },
  });

  return (
    <div className="py-5">
      <QuizzesPanel classrooms={classrooms.map((r: ClassroomRow) => ({ ...r.Classroom, roleInClass: r.roleInClass }))} />
    </div>
  );
}
// EOF
