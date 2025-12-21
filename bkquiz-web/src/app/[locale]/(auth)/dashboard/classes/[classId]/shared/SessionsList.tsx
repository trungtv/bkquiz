'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Session } from '../types';
import { formatDate } from '../types';

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
    <div className="space-y-2">
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
            <div
              key={s.id}
              className={`flex items-center justify-between gap-4 rounded-md border bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
                s.status === 'active'
                  ? 'border-indigo-500/50 bg-indigo-500/5 hover:border-indigo-500/70'
                  : 'border-indigo-500/30 hover:border-indigo-500/50'
              }`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-heading">
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
              <div className="flex items-center gap-3">
                <Badge
                  variant={s.status === 'active' ? 'success' : (s.status === 'ended' ? 'neutral' : 'info')}
                  className="text-xs"
                >
                  {s.status}
                </Badge>
                {s.status === 'active'
                  ? (
                      <Link href={`/session/${s.id}`}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-indigo-500 hover:bg-indigo-600 hover:scale-105"
                        >
                          Join →
                        </Button>
                      </Link>
                    )
                  : (
                      <Link href={`/session/${s.id}`}>
                        <Button variant="ghost" size="sm" className="hover:scale-105">
                          Xem
                        </Button>
                      </Link>
                    )}
              </div>
            </div>
          );
        }

        // Teacher view
        return (
          <div
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-border-strong"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <Link href={`/dashboard/sessions/${s.id}/teacher`} className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-heading">
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
            </Link>
            <div className="flex items-center gap-3">
              <Badge
                variant={s.status === 'active' ? 'success' : (s.status === 'ended' ? 'neutral' : 'info')}
                className="text-xs"
              >
                {s.status}
              </Badge>
              {(s.status === 'lobby' || s.status === 'ended') && (
                <Link
                  href={`/dashboard/sessions/${s.id}/questions`}
                  onClick={e => e.stopPropagation()}
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
