import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge(props: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const { className, variant = 'neutral', ...rest } = props;
  const styles = {
    neutral: 'bg-bg-section text-text-muted border border-border-subtle',
    info: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    danger: 'bg-danger/10 text-danger border border-danger/20',
  }[variant];
  // Note: /10 and /20 are Tailwind opacity modifiers, not our custom tokens
  // They work correctly with semantic colors, so we keep them as-is

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', styles, className)}
      {...rest}
    />
  );
}
// EOF
