import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'RootLayout',
  });

  return (
    <>
      <BaseTemplate
        leftNav={(
          <>
            <li>
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
              >
                {t('home_link')}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/"
                className="rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
              >
                Dashboard
              </Link>
            </li>
          </>
        )}
        rightNav={(
          <>
            <li>
              <Link
                href="/sign-in/"
                className="rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
              >
                {t('sign_in_link')}
              </Link>
            </li>

            <li>
              <Link
                href="/sign-up/"
                className="rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
              >
                {t('sign_up_link')}
              </Link>
            </li>

            <li>
              <LocaleSwitcher />
            </li>
          </>
        )}
      >
        <div className="text-base">{props.children}</div>
      </BaseTemplate>
    </>
  );
}
