import { useTranslations } from 'next-intl';
import { AppConfig } from '@/utils/AppConfig';

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const t = useTranslations('BaseTemplate');

  return (
    <div className="w-full text-text-body antialiased">
      <header className="sticky top-0 z-modal border-b border-border-subtle bg-bg-page/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight text-text-heading">
              {AppConfig.name}
            </div>
            <div className="hidden truncate text-xs text-text-muted sm:block">
              {t('description')}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav aria-label="Main navigation" className="hidden md:block">
              <ul className="flex flex-wrap items-center gap-2 text-sm">
                {props.leftNav}
              </ul>
            </nav>

            <nav aria-label="Secondary navigation">
              <ul className="flex flex-wrap items-center gap-2 text-sm">
                {props.rightNav}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{props.children}</main>

      <footer className="border-t border-border-subtle bg-bg-page py-10 text-center text-sm text-text-muted">
        <div className="mx-auto max-w-6xl px-4">
          {`© ${new Date().getFullYear()} ${AppConfig.name}. `}
          {t.rich('made_with', {
            author: () => (
              <a
                href="https://nextjs-boilerplate.com"
                className="text-primary hover:border-b-2 hover:border-primary"
              >
                Next.js Boilerplate
              </a>
            ),
          })}
        </div>
      </footer>
    </div>
  );
};
