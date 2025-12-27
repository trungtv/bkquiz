import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { AppConfig } from '@/utils/AppConfig';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

type ISignUpPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ISignUpPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'SignUp',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignUpPage(props: ISignUpPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'SignUp',
  });

  return (
    <div className="mx-auto w-full max-w-md px-4">
      <Card className="p-8 md:p-10">
        {/* Logo/Brand */}
        <div className="mb-6 text-center">
          <Link
            href={`/${locale}/`}
            className="inline-block text-2xl font-bold text-text-heading transition-colors hover:text-primary"
          >
            {AppConfig.name}
          </Link>
          <p className="mt-2 text-sm text-text-muted">
            {t('tagline')}
          </p>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-semibold text-text-heading">
          {t('title')}
        </h1>
        <p className="mb-6 text-sm text-text-body">
          {t('description')}
        </p>

        {/* Sign Up Form (same as sign-in) */}
        <GoogleSignInButton />

        {/* Already have account */}
        <div className="mt-6 border-t border-border-subtle pt-6 text-center">
          <p className="text-sm text-text-muted">
            {t('already_have_account')}{' '}
            <Link
              href={`/${locale}/sign-in`}
              className="font-medium text-primary hover:underline"
            >
              {t('sign_in_link')}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-text-muted">
            {t('terms_text')}{' '}
            <Link
              href={`/${locale}/terms`}
              className="text-primary hover:underline"
            >
              {t('terms_link')}
            </Link>
            {' '}{t('and')}{' '}
            <Link
              href={`/${locale}/privacy`}
              className="text-primary hover:underline"
            >
              {t('privacy_link')}
            </Link>
            .
          </p>
        </div>
      </Card>

      {/* Back to home */}
      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/`}
          className="text-sm text-text-muted hover:text-text-heading transition-colors"
        >
          {t('back_to_home')}
        </Link>
      </div>
    </div>
  );
}
