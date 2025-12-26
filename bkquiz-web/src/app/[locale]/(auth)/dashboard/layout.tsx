import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { getUserRole, requireUser } from '@/server/authz';
import { AppConfig } from '@/utils/AppConfig';
import { MobileMenuButton } from './MobileMenuButton';
import { Sidebar } from './Sidebar';
import { SignOutButton } from './SignOutButton';

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

  const { userId, devRole } = await requireUser();
  const role = await getUserRole(
    userId,
    devRole as 'teacher' | 'student' | undefined,
  );

  return (
    <div className="min-h-screen bg-bg-page text-text-body antialiased">
      <div className="flex h-screen">
        {/* Sidebar – Desktop: always visible, Mobile: slide in/out */}
        <Sidebar
          role={role}
          dashboardLink={t('dashboard_link')}
          classesLink={t('classes_link')}
          quizzesLink={t('quizzes_link')}
          questionBankLink={t('question_bank_link')}
          userProfileLink={t('user_profile_link')}
        />

        {/* Main column */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-bg-section/90 px-6 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <MobileMenuButton />
              <Link
                href={`/${locale}/`}
                className="text-base font-semibold text-text-heading transition-colors hover:text-primary"
              >
                {AppConfig.name}
              </Link>
              <span className="hidden text-sm text-text-muted sm:inline">
                Dashboard
              </span>
              <span
                className={`hidden rounded-sm px-2 py-1 text-xs font-medium sm:inline ${
                  role === 'teacher'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}
              >
                {role === 'teacher' ? 'Teacher' : 'Student'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <LocaleSwitcher />
              <SignOutButton label={t('sign_out')} />
            </div>
          </header>

          {/* Main content */}
          <main className="px-4 py-4 md:px-6 md:py-6">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
