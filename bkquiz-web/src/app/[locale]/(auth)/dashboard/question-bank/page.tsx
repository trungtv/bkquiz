import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/server/authz';
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
  const { userId } = await requireUser();

  const owned = await prisma.questionPool.findMany({
    where: { ownerTeacherId: userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, visibility: true, updatedAt: true },
  });

  return (
    <div className="py-5">
      <QuestionBankPanel initialOwned={owned} />
    </div>
  );
}
