'use client';

import { signIn } from 'next-auth/react';

export function SignInClient() {
  return (
    <button
      type="button"
      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white"
      onClick={() => void signIn('google', { callbackUrl: '/dashboard' })}
    >
      Đăng nhập Google
    </button>
  );
}
