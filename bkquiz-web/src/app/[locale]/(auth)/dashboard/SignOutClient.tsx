'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

type SignOutClientProps = {
  label?: string;
  variant?: 'button' | 'link';
  className?: string;
};

export function SignOutClient({ label = 'Đăng xuất', variant = 'button', className }: SignOutClientProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      // Xóa cookie dev role nếu đang ở dev mode (server sẽ kiểm tra)
      try {
        await fetch('/api/dev/signout', { method: 'POST' });
      } catch (err) {
        // Ignore nếu không phải dev mode hoặc API không tồn tại
      }
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoading(false);
    }
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isLoading}
        className={`text-text-muted hover:text-text-heading transition-colors disabled:opacity-50 ${className || ''}`}
      >
        {isLoading ? 'Đang đăng xuất...' : label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
    >
      {isLoading
        ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Đang đăng xuất...</span>
            </>
          )
        : (
            <>
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
              <span>{label}</span>
            </>
          )}
    </Button>
  );
}
