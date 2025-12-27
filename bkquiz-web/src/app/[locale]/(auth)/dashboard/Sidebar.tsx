'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';

type SidebarProps = {
  role: 'teacher' | 'student';
  availableRoles?: ('teacher' | 'student')[];
  dashboardLink: string;
  classesLink: string;
  quizzesLink: string;
  questionBankLink: string;
  userProfileLink: string;
  teacherRole: string;
  studentRole: string;
  mySessions: string;
  userProfile: string;
  collapseSidebar: string;
  expandSidebar: string;
  signOutLabel?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  // Always start with true to match server render (avoid hydration mismatch)
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load from localStorage after mount (client-side only)
  // Use useLayoutEffect to sync before paint to minimize flash
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded');
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Save vào localStorage khi state thay đổi (chỉ sau khi đã load)
  useLayoutEffect(() => {
    if (hasLoaded) {
      try {
        localStorage.setItem('sidebar-expanded', String(isExpanded));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [isExpanded, hasLoaded]);

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

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
    document.body.removeAttribute('data-sidebar-open');
  }, [pathname]); // Only depend on pathname, not isMobileOpen

  // Check if mobile sidebar should be open (from data attribute or props)
  useEffect(() => {
    const checkMobileOpen = () => {
      const isOpen = document.body.getAttribute('data-sidebar-open') === 'true';
      setIsMobileOpen((prev) => {
        // Only update if different to avoid unnecessary re-renders
        return isOpen !== prev ? isOpen : prev;
      });
    };
    // Check on mount and when attribute changes
    checkMobileOpen();
    const observer = new MutationObserver(checkMobileOpen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-sidebar-open'] });
    return () => observer.disconnect();
  }, []); // Only run once on mount, then rely on MutationObserver

  // Use external state if provided (for provider pattern), otherwise use internal state
  const showMobile = props.isMobileOpen ?? isMobileOpen;
  const handleMobileClose = props.onMobileClose ?? (() => {
    setIsMobileOpen(false);
    document.body.removeAttribute('data-sidebar-open');
  });

  return (
    <>
      {/* Mobile overlay */}
      {showMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide in/out */}
      <aside
        suppressHydrationWarning
        className={`fixed top-0 left-0 z-50 h-screen border-r border-border-subtle bg-bg-section/95 transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:h-full ${
          showMobile ? 'translate-x-0' : '-translate-x-full'
        } lg:block ${
          isExpanded ? 'w-64 px-4' : 'w-16 px-2'
        }`}
      >
        <div
          onClick={toggle}
          onKeyDown={handleKeyDown}
          role="button"
          aria-label={isExpanded ? props.collapseSidebar : props.expandSidebar}
          tabIndex={0}
          className="flex h-full flex-col py-4"
        >
          {/* Header với toggle button */}
          <div className="mb-6 flex items-center justify-between">
            {isExpanded
              ? (
                  <>
                    <div className="flex-1">
                        <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">
                        BKquiz
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="text-xs text-text-muted">
                          {props.dashboardLink}
                        </div>
                        <Badge
                          variant={props.role === 'teacher' ? 'success' : 'info'}
                          className="px-1.5 py-0.5 text-[10px]"
                        >
                          {props.role === 'teacher' ? props.teacherRole : props.studentRole}
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-card hover:text-text-heading"
                      aria-label={props.collapseSidebar}
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
                    aria-label={props.expandSidebar}
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
              title={isExpanded ? undefined : props.dashboardLink}
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
              title={isExpanded ? undefined : props.classesLink}
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

            {props.role === 'teacher'
              ? (
                  <>
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
                      title={isExpanded ? undefined : props.quizzesLink}
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
                      title={isExpanded ? undefined : props.questionBankLink}
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
                  </>
                )
              : (
                  <Link
                    href="/dashboard/sessions/"
                    onClick={e => e.stopPropagation()}
                    className={`flex items-center rounded-md py-2 transition-colors ${
                      isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
                    } ${
                      isActive('/dashboard/sessions')
                        ? 'bg-bg-card text-text-heading'
                        : 'text-text-muted hover:bg-bg-card hover:text-text-heading'
                    }`}
                    title={isExpanded ? undefined : props.mySessions}
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
                      className="lucide lucide-play-circle flex-shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="10 8 16 12 10 16 10 8" />
                    </svg>
                    {isExpanded && <span>{props.mySessions}</span>}
                  </Link>
                )}

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
              title={isExpanded ? undefined : props.userProfile}
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

          {/* Sign Out Button - Bottom of sidebar */}
          <div>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              // Xóa cookie dev role nếu đang ở dev mode (server sẽ kiểm tra)
              try {
                await fetch('/api/dev/signout', { method: 'POST' });
              } catch (err) {
                // Ignore nếu không phải dev mode hoặc API không tồn tại
              }
              void signOut({ callbackUrl: '/' });
            }}
              className={`flex w-full items-center rounded-md py-2 transition-colors ${
                isExpanded ? 'gap-3 px-3' : 'justify-center px-2'
              } text-text-muted hover:bg-bg-card hover:text-text-heading`}
              title={isExpanded ? undefined : props.signOutLabel || 'Sign out'}
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
                className="lucide lucide-log-out flex-shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              {isExpanded && <span>{props.signOutLabel || 'Đăng xuất'}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
