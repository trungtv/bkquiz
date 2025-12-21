import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserRole, requireUser } from '@/server/authz';
import { QuizRulesPanel } from './QuizRulesPanel';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Quizzes' });
  return { title: t('meta_title') };
}

export default async function QuizDetailPage(props: { params: Promise<{ quizId: string }> }) {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole);

  if (role !== 'teacher') {
    redirect('/dashboard');
  }

  const { quizId } = await props.params;
  return (
    <div className="py-5">
      <QuizRulesPanel quizId={quizId} userId={userId} />
    </div>
  );
}
// EOF
