import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

type IUserProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IUserProfilePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'UserProfile',
  });

  return {
    title: t('meta_title'),
  };
}

export default async function UserProfilePage(props: IUserProfilePageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { userId } = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  return (
    <div className="py-5">
      <h2 className="text-xl font-semibold text-text-heading">Hồ sơ</h2>
      <Card className="mt-4 p-4">
        <div className="text-sm text-text-muted">Email</div>
        <div className="font-medium">{user?.email ?? '-'}</div>
        <div className="mt-3 text-sm text-text-muted">Tên</div>
        <div className="font-medium">{user?.name ?? '-'}</div>
      </Card>
    </div>
  );
};
