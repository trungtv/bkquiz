import type { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export const Input = ({ ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: React.RefObject<HTMLInputElement | null> }) => {
  const { className, ...rest } = props;
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body outline-none transition-colors duration-fast ease-soft',
        'focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        'placeholder:text-text-muted disabled:opacity-disabled',
        className,
      )}
      {...rest}
    />
  );
};

Input.displayName = 'Input';
// EOF
