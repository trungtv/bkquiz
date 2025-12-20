'use client';

import { useEffect } from 'react';
import { cn } from '@/utils/cn';

type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-primary/10 text-primary border-primary/20',
  }[type];

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-toast rounded-md border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-2',
        styles,
      )}
      role="alert"
    >
      {message}
    </div>
  );
}
