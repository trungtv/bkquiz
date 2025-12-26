import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { QuestionPoolDetail } from './QuestionPoolDetail';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; poolId: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'QuestionBank' });
  return { title: t('meta_title') };
}

export default async function PoolDetailPage(props: {
  params: Promise<{ poolId: string }>;
}) {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  if (role !== 'teacher') {
    redirect('/dashboard');
  }

  const { poolId } = await props.params;

  return (
    <div className="py-5">
      <QuestionPoolDetail poolId={poolId} userId={userId} />
    </div>
  );
}
