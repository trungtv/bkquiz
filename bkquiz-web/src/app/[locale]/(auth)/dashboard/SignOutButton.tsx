'use client';

import { SignOutClient } from './SignOutClient';

type SignOutButtonProps = {
  label: string;
};

export function SignOutButton({ label }: SignOutButtonProps) {
  return (
    <SignOutClient
      label={label}
      variant="link"
      className="text-sm"
    />
  );
}
