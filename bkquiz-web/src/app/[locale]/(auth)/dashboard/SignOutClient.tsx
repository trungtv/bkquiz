'use client';

import { signOut } from 'next-auth/react';

export function SignOutClient(props: { label: string }) {
  return (
    <button
      type="button"
      className="border-none text-text-muted hover:text-text-heading"
      onClick={() => void signOut({ callbackUrl: '/' })}
    >
      {props.label}
    </button>
  );
}
