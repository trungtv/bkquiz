'use client';

import type { ChangeEventHandler } from 'react';
import { useState } from 'react';

type RoleSwitcherProps = {
  currentRole: 'teacher' | 'student';
  availableRoles?: ('teacher' | 'student')[]; // Giữ để tương thích, nhưng không dùng nữa
};

const DEFAULT_ROLES: Array<{ value: 'teacher' | 'student'; label: string }> = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

export function RoleSwitcher({
  currentRole,
}: RoleSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange: ChangeEventHandler<HTMLSelectElement> = async (event) => {
    const newRole = event.target.value as 'teacher' | 'student';

    if (newRole === currentRole || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/user/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        // Force full page reload để đảm bảo cookie và role được apply
        window.location.reload();
      } else {
        const json = (await res.json()) as { error?: string; message?: string };
        console.error('Failed to switch role:', json.message || json.error);
        // Reset select về giá trị cũ
        event.target.value = currentRole;
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error switching role:', error);
      // Reset select về giá trị cũ
      event.target.value = currentRole;
      setIsLoading(false);
    }
  };

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={isLoading}
      className={`rounded-md border border-border-subtle bg-bg-section px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${
        currentRole === 'teacher'
          ? 'text-orange-500'
          : 'text-indigo-400'
      }`}
      aria-label="role-switcher"
    >
      {DEFAULT_ROLES.map(role => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
