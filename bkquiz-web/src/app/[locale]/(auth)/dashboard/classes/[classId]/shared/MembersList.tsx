'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Member } from '../types';
import { formatDate } from '../types';

type MembersListProps = {
  members: Member[];
  isOwner: boolean;
  onAddMember?: () => void;
};

export function MembersList(props: MembersListProps) {
  const { members, isOwner, onAddMember } = props;

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-text-heading">
            {members.length}
            {' '}
            thành viên
          </div>
          {onAddMember && (
            <Button variant="primary" size="sm" className="hover:scale-105" onClick={onAddMember}>
              + Add Member
            </Button>
          )}
        </div>
      )}
      {members.length === 0
        ? (
            <div className="text-center py-8 text-sm text-text-muted">
              Chưa có thành viên nào.
            </div>
          )
        : members.map((m, idx) => (
            <div
              key={m.userId}
              className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-heading">
                      {m.user.name ?? m.user.email ?? 'N/A'}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {m.user.email}
                    </div>
                  </div>
                  <Badge
                    variant={m.roleInClass === 'teacher' ? 'success' : (m.roleInClass === 'ta' ? 'info' : 'neutral')}
                    className="text-xs"
                  >
                    {m.roleInClass === 'teacher' ? 'Teacher' : (m.roleInClass === 'ta' ? 'TA' : 'Student')}
                  </Badge>
                  <div className="text-xs text-text-muted">
                    <span className="font-mono">{formatDate(m.joinedAt)}</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    <span>-</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">→</span>
                </div>
              </div>
            </div>
          ))}
    </div>
  );
}

