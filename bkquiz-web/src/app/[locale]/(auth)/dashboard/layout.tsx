import { getTranslations, setRequestLocale } from 'next-intl/server';
import { signOut } from '@/auth';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { AppConfig } from '@/utils/AppConfig';
import { Sidebar } from './Sidebar';

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
        {/* Sidebar – Framer-style, hidden on mobile, với expand/collapse */}
        <Sidebar
          dashboardLink={t('dashboard_link')}
          classesLink={t('classes_link')}
          quizzesLink={t('quizzes_link')}
          questionBankLink={t('question_bank_link')}
          userProfileLink={t('user_profile_link')}
        />

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
