import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { AppConfig } from '@/utils/AppConfig';
import { SignInClient } from './SignInClient';

type ISignInPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ISignInPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignInPage(props: ISignInPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-md px-4">
      <Card className="p-8 md:p-10">
        {/* Logo/Brand */}
        <div className="mb-6 text-center">
          <Link
            href={`/${locale}/`}
            className="inline-block text-2xl font-bold text-text-heading transition-colors hover:text-primary"
          >
            {AppConfig.name}
          </Link>
          <p className="mt-2 text-sm text-text-muted">
            Quiz trên lớp với token 45s
          </p>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-semibold text-text-heading">
          Đăng nhập
        </h1>
        <p className="mb-6 text-sm text-text-body">
          Đăng nhập bằng Google để vào BKquiz. Nếu bạn chưa có tài khoản, hệ thống sẽ tự động tạo tài khoản mới khi đăng nhập lần đầu.
        </p>

        {/* Sign In Form */}
        <SignInClient />

        {/* Footer */}
        <div className="mt-6 border-t border-border-subtle pt-6 text-center">
          <p className="text-xs text-text-muted">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <Link
              href={`/${locale}/terms`}
              className="text-primary hover:underline"
            >
              Điều khoản sử dụng
            </Link>
            {' '}và{' '}
            <Link
              href={`/${locale}/privacy`}
              className="text-primary hover:underline"
            >
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      </Card>

      {/* Back to home */}
      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/`}
          className="text-sm text-text-muted hover:text-text-heading transition-colors"
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
