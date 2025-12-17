import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function DevRolePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <h1 className="text-2xl font-semibold">DEV: Chọn role để test</h1>
      <p className="text-sm text-gray-600">
        Chỉ dùng khi
        {' '}
        <span className="font-mono">DEV_BYPASS_AUTH=1</span>
        . Role được lưu bằng cookie.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-md bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
          href={`/api/dev/role?role=teacher&next=/${locale}/dashboard`}
        >
          Teacher
        </Link>
        <Link
          className="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
          href={`/api/dev/role?role=student&next=/${locale}/dashboard`}
        >
          Student
        </Link>
      </div>
      <div className="text-xs text-gray-500">
        Tip: đổi role nhanh bằng cách quay lại trang này.
      </div>
    </div>
  );
}
