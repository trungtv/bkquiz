'use client';

import type { ClassInfo } from '../types';
import { formatDate } from '../types';
import Link from 'next/link';
import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';

type ClassHeaderProps = {
  classInfo: ClassInfo;
  isOwner: boolean;
  onCreateSession?: () => void;
};

export function ClassHeader(props: ClassHeaderProps) {
  const { classInfo, isOwner, onCreateSession } = props;
  const [showQRCode, setShowQRCode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Generate join URL
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/classes?join=${classInfo.classCode}`
    : '';

  function shortenUrl(url: string) {
    if (url.length <= 50) {
      return url;
    }
    return `${url.slice(0, 25)}...${url.slice(-25)}`;
  }

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
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:scale-105"
              onClick={() => setShowQRCode(true)}
            >
              📱 QR Code
            </Button>
          )}
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

      {/* QR Code Modal - Full Screen giống Teacher Screen */}
      {showQRCode && (
        <div className="fixed inset-0 z-modal bg-black flex flex-col">
          {/* Header */}
          <div className="border-b border-white/10 bg-black/40 px-6 py-3 flex-shrink-0">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-white">
                  QR Code để join lớp
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {classInfo.name}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQRCode(false)}
                className="text-white/80 border-white/20 hover:bg-white/10"
              >
                Đóng
              </Button>
            </div>
          </div>

          {/* Main Content - QR Code + ClassCode - To hơn */}
          <div className="flex-1 flex items-center justify-center px-6 py-6 overflow-hidden">
            <div className="w-full max-w-7xl grid gap-8 lg:grid-cols-2">
              {/* QR Code Section - Left */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-base font-medium text-white/60 mb-4">QR để sinh viên join lớp</div>
                <div className="flex items-center justify-center">
                  {joinUrl
                    ? (
                        <div className="rounded-lg bg-white p-5 shadow-2xl">
                          <QRCode value={joinUrl} size={420} />
                        </div>
                      )
                    : (
                        <div className="w-[420px]">
                          <div className="mx-auto h-[420px] w-[420px] rounded-lg bg-white/10" />
                          <div className="mt-2 text-center text-sm text-white/40">Đang tải QR...</div>
                        </div>
                      )}
                </div>
              </div>

              {/* ClassCode Section - Right (giống Token style) */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-base font-medium text-white/60 mb-4">Class Code</div>
                <div className="text-center w-full">
                  <div className="text-7xl font-bold tracking-[0.3em] text-primary mb-6 font-mono">
                    {classInfo.classCode}
                  </div>
                  <div className="mt-6 max-w-md mx-auto">
                    <div className="rounded-md bg-white/5 border border-white/10 p-2 break-all text-xs text-white/60 font-mono">
                      {joinUrl ? shortenUrl(joinUrl) : '...'}
                    </div>
                    <div className="mt-2 text-xs text-white/40">
                      Sinh viên quét QR để join lớp
                    </div>
                  </div>
                  <div className="mt-4 max-w-md mx-auto">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrl);
                        setToast({ message: 'Đã copy link!', type: 'success' });
                      }}
                      className="text-white/80 border-white/20 hover:bg-white/10 text-sm px-4 py-2"
                    >
                      📋 Copy Link để Share
                    </Button>
                  </div>
                  <div className="mt-4 max-w-md mx-auto">
                    <div className="rounded-md bg-white/5 border border-white/10 p-3 text-xs text-white/60">
                      Gợi ý: Chiếu màn hình này lên projector. Sinh viên scan QR để vào link hoặc nhập class code này để join lớp.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Card>
  );
}
