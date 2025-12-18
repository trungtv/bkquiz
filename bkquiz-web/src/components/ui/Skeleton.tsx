import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Skeleton(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cn('animate-pulse bk-skeleton', className)}
      {...rest}
    />
  );
}
// EOF
