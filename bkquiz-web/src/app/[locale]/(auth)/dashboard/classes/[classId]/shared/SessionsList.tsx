'use client';

import Link from 'next/link';
import type { Session } from '../types';
import { formatDate } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type SessionsListProps = {
  sessions: Session[];
  isStudent: boolean;
  onCreateSession?: () => void;
};

export function SessionsList(props: SessionsListProps) {
  const { sessions, isStudent, onCreateSession } = props;

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-text-muted">
        Chưa có session nào.
        {onCreateSession && (
          <div className="mt-2">
            <Button
              variant="primary"
              size="sm"
              className="hover:scale-105"
              onClick={onCreateSession}
            >
              Tạo session đầu tiên
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onCreateSession && sessions.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-text-heading">
            {sessions.length}
            {' '}
            sessions
          </div>
          <Button
            variant="primary"
            size="sm"
            className="hover:scale-105"
            onClick={onCreateSession}
          >
            + Create Session
          </Button>
        </div>
      )}
      {sessions.map((s, idx) => {
        if (isStudent) {
          return (
            <Link key={s.id} href={`/session/${s.id}`}>
              <div
                className={`rounded-md border bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
                  s.status === 'active'
                    ? 'border-indigo-500/50 bg-indigo-500/5 hover:border-indigo-500/70'
                    : 'border-indigo-500/30 hover:border-indigo-500/50'
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-heading">
                        {s.quiz.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {s.status === 'active' && 'Đang diễn ra'}
                        {s.status === 'ended' && 'Đã kết thúc'}
                        {s.status === 'lobby' && 'Chờ bắt đầu'}
                        {' '}
                        ·
                        {' '}
                        {formatDate(s.createdAt)}
                      </div>
                    </div>
                    <Badge
                      variant={s.status === 'active' ? 'success' : (s.status === 'ended' ? 'neutral' : 'info')}
                      className="text-xs"
                    >
                      {s.status}
                    </Badge>
                    <div className="text-xs text-text-muted">
                      <span>-</span>
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
            </Link>
          );
        }

        // Teacher view
        return (
          <div
            key={s.id}
            className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/dashboard/sessions/${s.id}/teacher`} className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-heading">
                    {s.quiz.title}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {s.attemptCount}
                    {' '}
                    attempts
                    {' '}
                    ·
                    {' '}
                    {formatDate(s.createdAt)}
                  </div>
                </div>
                <Badge
                  variant={s.status === 'active' ? 'success' : (s.status === 'ended' ? 'neutral' : 'info')}
                  className="text-xs"
                >
                  {s.status}
                </Badge>
                <div className="text-xs text-text-muted">
                  {s.status === 'lobby' || s.status === 'ended' ? '' : <span className="font-mono">-</span>}
                </div>
                <div className="text-xs text-text-muted">
                  <span>-</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {(s.status === 'lobby' || s.status === 'ended') && (
                  <Link
                    href={`/dashboard/sessions/${s.id}/questions`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Button variant="ghost" size="sm" className="hover:scale-105">
                      View Questions
                    </Button>
                  </Link>
                )}
                <Link href={`/dashboard/sessions/${s.id}/teacher`}>
                  <span className="text-xs text-text-muted">→</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
      {isStudent && sessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <Link href="/dashboard/sessions">
            <Button variant="ghost" size="sm" className="w-full">
              Xem tất cả sessions của tôi
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
