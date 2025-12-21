'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ClassHeader } from './shared/ClassHeader';
import { MembersList } from './shared/MembersList';
import { SessionsList } from './shared/SessionsList';
import { StatsCards } from './shared/StatsCards';
import type { ClassInfo, Member, Session } from './types';

type StudentClassDetailProps = {
  classId: string;
};

export function StudentClassDetail(props: StudentClassDetailProps) {
  const { classId } = props;
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'sessions'>('members');

  async function loadClassInfo() {
    const res = await fetch(`/api/classes/${classId}`, { method: 'GET' });
    const json = await res.json() as ClassInfo | { error?: string };
    if (!res.ok) {
      return;
    }
    setClassInfo(json as ClassInfo);
  }

  async function loadMembers() {
    const res = await fetch(`/api/classes/${classId}/members`, { method: 'GET' });
    const json = await res.json() as { members?: Member[]; error?: string };
    if (!res.ok) {
      return;
    }
    setMembers(json.members ?? []);
  }

  async function loadSessions() {
    const res = await fetch(`/api/classes/${classId}/sessions`, { method: 'GET' });
    const json = await res.json() as { sessions?: Session[]; error?: string };
    if (!res.ok) {
      return;
    }
    setSessions(json.sessions ?? []);
  }

  useEffect(() => {
    void Promise.all([loadClassInfo(), loadMembers(), loadSessions()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  if (!classInfo) {
    return (
      <div className="space-y-7">
        <Card className="p-5 md:p-6">
          <div className="text-center text-text-muted">Đang tải...</div>
        </Card>
      </div>
    );
  }

  const isOwner = classInfo.userRole === 'teacher';

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="text-sm animate-slideUp">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/dashboard/classes" className="hover:text-text-heading transition-colors">
            Classes
          </Link>
          <span>·</span>
          <span className="text-text-heading">{classInfo.name}</span>
          <Badge variant="info" className="text-[10px] px-1.5 py-0.5 ml-2">
            Student
          </Badge>
        </div>
      </nav>

      {/* Class Header */}
      <ClassHeader classInfo={classInfo} isOwner={isOwner} />

      {/* Stats Cards */}
      <StatsCards members={members} sessions={sessions} isOwner={isOwner} />

      {/* Tabs */}
      <Card className="p-5 md:p-6 animate-slideUp border-indigo-500/20" style={{ animationDelay: '150ms' }}>
        <div className="flex gap-2 border-b border-border-subtle">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-b-2 border-indigo-500 text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'border-b-2 border-indigo-500 text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            My Sessions
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'members' && (
            <MembersList members={members} isOwner={isOwner} />
          )}

          {activeTab === 'sessions' && (
            <SessionsList sessions={sessions} isStudent />
          )}
        </div>
      </Card>
    </div>
  );
}

