import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUserRole, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { QuestionBankPanel } from './QuestionBankPanel';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'QuestionBank' });
  return { title: t('meta_title') };
}

export default async function QuestionBankPage() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  if (role !== 'teacher') {
    redirect('/dashboard');
  }

  const owned = await prisma.questionPool.findMany({
    where: { ownerTeacherId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      visibility: true,
      updatedAt: true,
      _count: {
        select: {
          questions: { where: { deletedAt: null } },
        },
      },
    },
  });

  // Get tag counts for each pool
  const ownedWithStats = await Promise.all(
    owned.map(async (pool) => {
      // Use groupBy to count distinct tags
      const tagGroups = await prisma.questionTag.groupBy({
        by: ['tagId'],
        where: {
          question: {
            poolId: pool.id,
            deletedAt: null,
          },
        },
      });
      return {
        id: pool.id,
        name: pool.name,
        visibility: pool.visibility,
        updatedAt: pool.updatedAt,
        questionCount: pool._count.questions,
        tagCount: tagGroups.length,
      };
    }),
  );

  return (
    <div className="py-5">
      <QuestionBankPanel initialOwned={ownedWithStats} />
    </div>
  );
}
