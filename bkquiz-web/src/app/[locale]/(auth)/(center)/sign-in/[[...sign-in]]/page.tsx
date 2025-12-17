import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignInClient } from './SignInClient';

type ISignInPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ISignInPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignInPage(props: ISignInPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      <p className="text-sm text-zinc-600">
        Đăng nhập bằng Google để vào BKquiz.
      </p>
      <SignInClient />
    </div>
  );
};
