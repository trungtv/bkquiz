import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function TableWrap(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn('bk-table-wrap', className)} {...rest} />;
}

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  const { className, ...rest } = props;
  return (
    <table
      className={cn('min-w-full border-separate border-spacing-0 text-left text-sm', className)}
      {...rest}
    />
  );
}
// EOF
