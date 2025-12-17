import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
      <h2 className="text-xl font-semibold">Hồ sơ</h2>
      <div className="mt-4 rounded-lg border bg-white p-4">
        <div className="text-sm text-gray-600">Email</div>
        <div className="font-medium">{user?.email ?? '-'}</div>
        <div className="mt-3 text-sm text-gray-600">Tên</div>
        <div className="font-medium">{user?.name ?? '-'}</div>
      </div>
    </div>
  );
};
