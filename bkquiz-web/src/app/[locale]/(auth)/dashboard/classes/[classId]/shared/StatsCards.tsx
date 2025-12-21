'use client';

import { Card } from '@/components/ui/Card';
import type { Member, Session } from '../types';

type StatsCardsProps = {
  members: Member[];
  sessions: Session[];
  isOwner: boolean;
};

export function StatsCards(props: StatsCardsProps) {
  const { members, sessions, isOwner } = props;

  return (
    <div
      className="grid gap-4 md:grid-cols-4 animate-slideUp"
      style={{ animationDelay: '100ms' }}
    >
      <Card
        className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          isOwner ? '' : 'border-indigo-500/20'
        }`}
      >
        <div className="text-xs text-text-muted">Thành viên</div>
        <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
          {members.length}
        </div>
      </Card>
      <Card
        className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          isOwner ? '' : 'border-indigo-500/20'
        }`}
      >
        <div className="text-xs text-text-muted">Tổng sessions</div>
        <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
          {sessions.length}
        </div>
      </Card>
      <Card
        className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          isOwner ? '' : 'border-indigo-500/20'
        }`}
      >
        <div className="text-xs text-text-muted">Active sessions</div>
        <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
          {sessions.filter(s => s.status === 'active').length}
        </div>
      </Card>
      <Card
        className={`p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          isOwner ? '' : 'border-indigo-500/20'
        }`}
      >
        <div className="text-xs text-text-muted">Ended sessions</div>
        <div className={`mt-1 text-2xl font-semibold ${isOwner ? 'text-text-heading' : 'text-indigo-400'}`}>
          {sessions.filter(s => s.status === 'ended').length}
        </div>
      </Card>
    </div>
  );
}

