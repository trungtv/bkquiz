import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { signOut } from '@/auth';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { AppConfig } from '@/utils/AppConfig';

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'DashboardLayout',
  });

  return (
    <div className="min-h-screen bg-bg-page text-text-body antialiased">
      <div className="flex">
        {/* Sidebar – Framer-style, hidden on mobile */}
        <aside className="hidden w-64 border-r border-border-subtle bg-bg-section/95 px-4 py-4 lg:block">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              BKquiz
            </div>
            <div className="mt-1 text-xs text-text-muted">
              Dashboard
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            <Link
              href="/dashboard/"
              className="block rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
            >
              {t('dashboard_link')}
            </Link>
            <Link
              href="/dashboard/quizzes/"
              className="block rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
            >
              {t('quizzes_link')}
            </Link>
            <Link
              href="/dashboard/question-bank/"
              className="block rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
            >
              {t('question_bank_link')}
            </Link>
            <Link
              href="/dashboard/user-profile/"
              className="block rounded-md px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
            >
              {t('user_profile_link')}
            </Link>
          </nav>
        </aside>

        {/* Main column */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-bg-section/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-heading">
                {AppConfig.name}
              </span>
              <span className="hidden text-xs text-text-muted sm:inline">
                Dashboard
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <LocaleSwitcher />
              <form
                action={async () => {
                  'use server';
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="rounded-sm px-3 py-2 text-text-muted hover:bg-bg-card hover:text-text-heading"
                >
                  {t('sign_out')}
                </button>
              </form>
            </div>
          </header>

          {/* Main content */}
          <main className="px-4 py-4 md:px-6 md:py-6">
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
}
