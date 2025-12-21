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
    <div className="space-y-2">
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
              className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-heading">
                  {m.user.name ?? m.user.email ?? 'N/A'}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {m.user.email}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={m.roleInClass === 'teacher' ? 'success' : (m.roleInClass === 'ta' ? 'info' : 'neutral')}
                  className="text-xs"
                >
                  {m.roleInClass === 'teacher' ? 'Teacher' : (m.roleInClass === 'ta' ? 'TA' : 'Student')}
                </Badge>
                <div className="text-xs text-text-muted">
                  {formatDate(m.joinedAt)}
                </div>
              </div>
            </div>
          ))}
    </div>
  );
}

