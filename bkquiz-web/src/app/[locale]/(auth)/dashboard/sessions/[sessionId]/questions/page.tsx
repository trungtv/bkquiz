import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { QuestionsView } from './QuestionsView';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: 'Questions in Session - BKquiz' };
}

export default async function QuestionsPage(props: {
  params: Promise<{ sessionId: string }>;
}) {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole);

  if (role !== 'teacher') {
    redirect('/dashboard');
  }

  const { sessionId } = await props.params;
  return (
    <div className="py-5">
      <QuestionsView sessionId={sessionId} userId={userId} />
    </div>
  );
}
