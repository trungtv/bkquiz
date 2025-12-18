'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { CounterValidation } from '@/validations/CounterValidation';

export const CounterForm = () => {
  const t = useTranslations('CounterForm');
  const form = useForm({
    resolver: zodResolver(CounterValidation),
    defaultValues: {
      increment: 1,
    },
  });
  const router = useRouter();

  const handleIncrement = form.handleSubmit(async (data) => {
    const response = await fetch(`/api/counter`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    await response.json();

    router.refresh();
  });

  return (
    <form onSubmit={handleIncrement}>
      <p>{t('presentation')}</p>
      <div>
        <label className="text-sm font-bold text-text-heading" htmlFor="increment">
          {t('label_increment')}
          <input
            id="increment"
            type="number"
            className="ml-2 w-32 appearance-none rounded-sm border border-border-subtle bg-bg-card px-2 py-1 text-sm leading-tight text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
            {...form.register('increment', { valueAsNumber: true })}
          />
        </label>

        {form.formState.errors.increment && (
          <div className="my-2 text-xs italic text-danger">
            {t('error_increment_range')}
          </div>
        )}
      </div>

      <div className="mt-2">
        <Button size="sm" variant="primary" type="submit" disabled={form.formState.isSubmitting}>
          {t('button_increment')}
        </Button>
      </div>
    </form>
  );
};
