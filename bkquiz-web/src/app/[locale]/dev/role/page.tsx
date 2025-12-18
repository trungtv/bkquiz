import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function DevRolePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <h1 className="text-2xl font-semibold">DEV: Chọn role để test</h1>
      <p className="text-sm text-text-muted">
        Chỉ dùng khi
        {' '}
        <span className="font-mono">DEV_BYPASS_AUTH=1</span>
        . Role được lưu bằng cookie.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/api/dev/role?role=teacher&next=/${locale}/dashboard`}
        >
          <Button variant="primary" className="w-full text-center">
            Teacher
          </Button>
        </Link>
        <Link
          href={`/api/dev/role?role=student&next=/${locale}/dashboard`}
        >
          <Button variant="ghost" className="w-full text-center">
            Student
          </Button>
        </Link>
      </div>
      <div className="text-xs text-text-muted">
        Tip: đổi role nhanh bằng cách quay lại trang này.
      </div>
    </div>
  );
}
