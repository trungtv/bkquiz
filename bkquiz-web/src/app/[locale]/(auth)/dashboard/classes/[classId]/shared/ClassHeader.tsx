'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ClassInfo } from '../types';
import { formatDate } from '../types';

type ClassHeaderProps = {
  classInfo: ClassInfo;
  isOwner: boolean;
  onCreateSession?: () => void;
};

export function ClassHeader(props: ClassHeaderProps) {
  const { classInfo, isOwner, onCreateSession } = props;

  return (
    <Card
      className={`p-5 md:p-6 animate-slideUp transition-all duration-200 hover:shadow-lg ${
        isOwner ? 'border-primary/20' : 'border-indigo-500/20'
      }`}
      style={{ animationDelay: '50ms' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-heading truncate">
              {classInfo.name}
            </h1>
            <Badge variant={isOwner ? 'success' : (classInfo.userRole === 'ta' ? 'info' : 'neutral')}>
              {isOwner ? 'Owner' : (classInfo.userRole === 'ta' ? 'TA' : 'Student')}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>
              Class Code:
              {' '}
              <span className="font-mono">{classInfo.classCode}</span>
            </span>
            <span>·</span>
            <span>
              {classInfo.memberCount}
              {' '}
              thành viên
            </span>
            <span>·</span>
            <span>
              Tạo:
              {' '}
              {formatDate(classInfo.createdAt)}
            </span>
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Owner:
            {' '}
            {classInfo.ownerTeacher.name ?? classInfo.ownerTeacher.email ?? 'N/A'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && onCreateSession && (
            <Button
              variant="primary"
              size="sm"
              className="hover:scale-105"
              onClick={onCreateSession}
            >
              + Tạo Session
            </Button>
          )}
          <Link href="/dashboard/classes">
            <Button variant="ghost" size="sm" className="hover:scale-105">
              ← Quay lại
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

