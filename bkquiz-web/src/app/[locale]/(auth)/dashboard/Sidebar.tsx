'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type SidebarProps = {
  dashboardLink: string;
  classesLink: string;
  quizzesLink: string;
  questionBankLink: string;
  userProfileLink: string;
};

export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  // Lazy initialization: chỉ chạy một lần khi component mount
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // Save vào localStorage khi state thay đổi
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(isExpanded));
  }, [isExpanded]);

  const toggle = () => {
    setIsExpanded(prev => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <aside
      className={`hidden border-r border-border-subtle bg-bg-section/95 transition-all duration-300 lg:block ${
        isExpanded ? 'w-64 px-4' : 'w-16 px-2'
      }`}
    >
      <div
        onClick={toggle}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        tabIndex={0}
        className="flex h-full cursor-pointer flex-col py-4"
      >
        {/* Header với toggle button */}
        <div className="mb-6 flex items-center justify-between">
          {isExpanded
            ? (
                <>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                      BKquiz
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      Dashboard
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-card hover:text-text-heading"
                    aria-label="Collapse sidebar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-left"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                </>
              )
            : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="mx-auto rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-card hover:text-text-heading"
                  aria-label="Expand sidebar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-right"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1 text-sm">
          <Link
            href="/dashboard/"
            onClick={e => e.stopPropagation()}
            className={`flex items-center rounded-md py-2 transition-colors ${
              isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
            } ${
              pathname === '/dashboard'
                ? 'bg-bg-card text-text-heading'
                : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
            }`}
            title={isExpanded ? undefined : 'Dashboard'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-layout-dashboard flex-shrink-0"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            {isExpanded && <span>{props.dashboardLink}</span>}
          </Link>

          <Link
            href="/dashboard/classes/"
            onClick={e => e.stopPropagation()}
            className={`flex items-center rounded-md py-2 transition-colors ${
              isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
            } ${
              isActive('/dashboard/classes')
                ? 'bg-bg-card text-text-heading'
                : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
            }`}
            title={isExpanded ? undefined : 'Classes'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-users flex-shrink-0"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {isExpanded && <span>{props.classesLink}</span>}
          </Link>

          <Link
            href="/dashboard/quizzes/"
            onClick={e => e.stopPropagation()}
            className={`flex items-center rounded-md py-2 transition-colors ${
              isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
            } ${
              isActive('/dashboard/quizzes')
                ? 'bg-bg-card text-text-heading'
                : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
            }`}
            title={isExpanded ? undefined : 'Quizzes'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-file-question flex-shrink-0"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.2.5.5.6.9a2.1 2.1 0 0 1-1.5 2.5c-.4 0-.8.1-1.2.3" />
              <path d="M12 17h.01" />
            </svg>
            {isExpanded && <span>{props.quizzesLink}</span>}
          </Link>

          <Link
            href="/dashboard/question-bank/"
            onClick={e => e.stopPropagation()}
            className={`flex items-center rounded-md py-2 transition-colors ${
              isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
            } ${
              isActive('/dashboard/question-bank')
                ? 'bg-bg-card text-text-heading'
                : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
            }`}
            title={isExpanded ? undefined : 'Question Bank'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-library flex-shrink-0"
            >
              <path d="m16 6 4 14" />
              <path d="M12 6v14" />
              <path d="M8 8v12" />
              <path d="M4 4v16" />
            </svg>
            {isExpanded && <span>{props.questionBankLink}</span>}
          </Link>

          <Link
            href="/dashboard/user-profile/"
            onClick={e => e.stopPropagation()}
            className={`flex items-center rounded-md py-2 transition-colors ${
              isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
            } ${
              isActive('/dashboard/user-profile')
                ? 'bg-bg-card text-text-heading'
                : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
            }`}
            title={isExpanded ? undefined : 'User Profile'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-user flex-shrink-0"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {isExpanded && <span>{props.userProfileLink}</span>}
          </Link>
        </nav>
      </div>
    </aside>
  );
}
