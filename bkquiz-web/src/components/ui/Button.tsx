import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const {
    className,
    variant = 'ghost',
    size = 'md',
    type = 'button',
    ...rest
  } = props;

  const base = 'inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-all duration-200 ease-out disabled:opacity-disabled disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'px-4 py-2 text-xs' : 'px-5 py-3 text-sm';
  const variants = {
    // Solid orange CTA – giống nút "Get access now"
    primary: 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] hover:shadow-md',
    // Charcoal outline – giống nút "What you'll learn"
    ghost:
      'border border-border-subtle bg-transparent text-text-heading hover:bg-bg-cardHover hover:border-border-strong active:scale-[0.98]',
    danger: 'bg-danger text-white hover:bg-danger/90 active:scale-[0.98]',
  }[variant];

  return (
    <button
      type={type}
      className={cn(base, sizes, variants, className)}
      {...rest}
    />
  );
}
// EOF
