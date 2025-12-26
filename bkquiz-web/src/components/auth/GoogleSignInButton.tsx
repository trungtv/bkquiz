'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const errorParam = searchParams.get('error');

  // Compute error message from URL directly during render
  const errorMessages: Record<string, string> = {
    Configuration: 'Lỗi cấu hình. Vui lòng liên hệ quản trị viên.',
    AccessDenied: 'Bạn không có quyền truy cập.',
    Verification: 'Lỗi xác thực. Vui lòng thử lại.',
    OAuthAccountNotLinked: 'Tài khoản với email này đã tồn tại. Vui lòng đăng nhập bằng phương thức ban đầu.',
    Default: 'Không thể đăng nhập. Vui lòng thử lại.',
  };
  const urlError = errorParam ? ((errorMessages[errorParam] ?? errorMessages.Default) as string) : null;
  const error = urlError || apiError;

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      await signIn('google', {
        callbackUrl: callbackUrl as string,
        redirect: true,
      });
    } catch {
      setApiError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading
          ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
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
                <span>Đang chuyển tới Google...</span>
              </>
            )
          : (
              <>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Đăng nhập với Google</span>
              </>
            )}
      </Button>

      <p className="text-xs text-text-muted text-center">
        Chúng tôi chỉ dùng email để nhận diện tài khoản và lưu kết quả quiz.
      </p>
    </div>
  );
}
