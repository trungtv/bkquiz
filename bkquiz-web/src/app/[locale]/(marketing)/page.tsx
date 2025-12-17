import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IIndexProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Index(props: IIndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  void (await getTranslations({ locale, namespace: 'Index' }));

  return (
    <>
      <div className="rounded-xl border bg-white p-6">
        <div className="text-sm text-gray-600">BKquiz</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Hệ thống quiz trên web cho lớp học
        </h1>
        <p className="mt-3 text-base text-gray-700">
          Dành cho giảng viên tạo lớp/quiz/session; sinh viên làm bài theo từng câu với autosave, checkpoint xác minh token theo thời gian (TOTP).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            href="/sign-in/"
          >
            Đăng nhập
          </Link>
          <Link
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            href="/dashboard/"
          >
            Đi tới Dashboard
          </Link>
        </div>
        <div className="mt-6 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="font-medium">Teacher screen</div>
            <div className="mt-1 text-gray-600">QR join + token đổi theo step (mặc định 45s) + log + scoreboard + export CSV.</div>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="font-medium">Student</div>
            <div className="mt-1 text-gray-600">Làm bài, autosave offline/online + sync, bị block khi tới checkpoint.</div>
          </div>
        </div>
      </div>
    </>
  );
};
