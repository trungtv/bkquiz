'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Sidebar } from './Sidebar';

type MobileSidebarContextType = {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
};

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null);

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within MobileSidebarProvider');
  }
  return context;
}

type MobileSidebarProviderProps = {
  children: ReactNode;
  role: 'teacher' | 'student';
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
};

export function MobileSidebarProvider(props: MobileSidebarProviderProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes (mobile only)
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [pathname, isMobileOpen]);

  const contextValue = useMemo(
    () => ({ isMobileOpen, setIsMobileOpen }),
    [isMobileOpen],
  );

  return (
    <MobileSidebarContext.Provider value={contextValue}>
      {props.children}
      {/* Mobile Sidebar - rendered separately for mobile */}
      <Sidebar
        role={props.role}
        dashboardLink={props.dashboardLink}
        classesLink={props.classesLink}
        quizzesLink={props.quizzesLink}
        questionBankLink={props.questionBankLink}
        userProfileLink={props.userProfileLink}
        teacherRole={props.teacherRole}
        studentRole={props.studentRole}
        mySessions={props.mySessions}
        userProfile={props.userProfile}
        collapseSidebar={props.collapseSidebar}
        expandSidebar={props.expandSidebar}
        signOutLabel={props.signOutLabel}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
    </MobileSidebarContext.Provider>
  );
}

export function MobileSidebarToggle() {
  const { setIsMobileOpen } = useMobileSidebar();

  return (
    <button
      type="button"
      onClick={() => setIsMobileOpen(true)}
      className="lg:hidden rounded-md p-2 text-text-muted hover:bg-bg-card hover:text-text-heading transition-colors"
      aria-label="Open menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </button>
  );
}
