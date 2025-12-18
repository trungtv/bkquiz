import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Card(props: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  const {
    className,
    interactive = false,
    ...rest
  } = props;
  return (
    <div
      className={cn(
        // Spec: không viền “gắt”; dùng overlay sáng nhẹ (ring) + shadow
        'relative bg-bg-card rounded-md shadow-card transition-all duration-normal before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:ring-1 before:ring-white/5',
        interactive && 'hover:shadow-hover hover:-translate-y-px cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
}
// EOF
