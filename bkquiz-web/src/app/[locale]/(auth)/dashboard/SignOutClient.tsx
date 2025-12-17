'use client';

import { signOut } from 'next-auth/react';

export function SignOutClient(props: { label: string }) {
  return (
    <button
      type="button"
      className="border-none text-gray-700 hover:text-gray-900"
      onClick={() => void signOut({ callbackUrl: '/' })}
    >
      {props.label}
    </button>
  );
}
