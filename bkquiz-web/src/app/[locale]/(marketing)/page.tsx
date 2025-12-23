import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
    <div className="space-y-8">
      {/* Hero */}
      <Card className="p-8 md:p-10">
        <div className="text-sm text-text-muted">BKquiz · Classroom Quiz Platform</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-heading md:text-4xl">
          Quiz cho lớp học, thiết kế cho thời đại realtime
        </h1>
        <p className="mt-3 max-w-2xl text-base text-text-body">
          Giảng viên tạo lớp, quiz và session chỉ trong vài phút; sinh viên làm bài câu‑theo‑câu với autosave,
          checkpoint TOTP và báo cáo chi tiết sau buổi học.
        </p>
        <div className="mt-4 grid gap-2 text-sm text-text-muted md:grid-cols-3">
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <div>
              <div className="font-medium text-text-heading">Tạo quiz trong vài phút</div>
              <div className="text-xs text-text-muted">
                Import 1 file
                {' '}
                <span className="font-mono">questions.md</span>
                {' '}
                là có ngay ngân hàng câu hỏi.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <div>
              <div className="font-medium text-text-heading">Autosave offline/online</div>
              <div className="text-xs text-text-muted">Sinh viên rớt mạng không mất bài, tự sync lại khi online.</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <div>
              <div className="font-medium text-text-heading">Checkpoint TOTP chống quay cóp</div>
              <div className="text-xs text-text-muted">Chỉ làm bài được khi có mặt trên lớp, theo token từng đợt.</div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/sign-in/">
            <Button variant="primary">Bắt đầu với Google (miễn phí)</Button>
          </Link>
          <Link href="/dashboard/">
            <Button variant="ghost">Xem thử Dashboard demo</Button>
          </Link>
          {/* GitHub Badge */}
          <Link
            href="https://github.com/trungtv/bkquiz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-body transition-colors hover:bg-bg-elevated"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>GitHub</span>
            <span className="text-xs text-text-muted">⭐</span>
          </Link>
        </div>
      </Card>

      {/* Feature blocks – Framer-style strips */}
      <div className="space-y-4">
        <Card interactive className="flex items-stretch overflow-hidden p-0">
          <div className="flex w-24 flex-col items-center justify-center gap-3 border-r border-border-subtle bg-bg-section">
            <span className="h-8 w-8 rounded-md border border-border-subtle" />
          </div>
          <div className="flex-1 p-6 md:p-7">
            <div className="text-sm font-medium text-primary">Dành cho giảng viên</div>
            <div className="mt-1 text-lg font-semibold text-text-heading">Dashboard lớp &amp; sessions rõ ràng</div>
            <p className="mt-2 text-sm text-text-muted">
              Tạo lớp, phân nhóm sinh viên, mapping môn học – tất cả nằm trong một dashboard. Bạn luôn biết mình đang
              dạy lớp nào, dùng quiz nào, và sinh viên nào đang tham gia.
            </p>
          </div>
        </Card>

        <Card interactive className="flex items-stretch overflow-hidden p-0">
          <div className="flex w-24 flex-col items-center justify-center gap-3 border-r border-border-subtle bg-bg-section">
            <span className="h-8 w-8 rounded-md border border-border-subtle" />
          </div>
          <div className="flex-1 p-6 md:p-7">
            <div className="text-sm font-medium text-primary">Question Bank</div>
            <div className="mt-1 text-lg font-semibold text-text-heading">Ngân hàng câu hỏi theo pool &amp; tag</div>
            <p className="mt-2 text-sm text-text-muted">
              Import Markdown/ZIP, gắn tag và chia pool cho từng chương. Quiz rules sẽ tự chọn câu phù hợp cho từng
              buổi kiểm tra, không cần copy‑paste đề thủ công.
            </p>
          </div>
        </Card>

        <Card interactive className="flex items-stretch overflow-hidden p-0">
          <div className="flex w-24 flex-col items-center justify-center gap-3 border-r border-border-subtle bg-bg-section">
            <span className="h-8 w-8 rounded-md border border-border-subtle" />
          </div>
          <div className="flex-1 p-6 md:p-7">
            <div className="text-sm font-medium text-primary">Teacher Screen</div>
            <div className="mt-1 text-lg font-semibold text-text-heading">Chiếu QR, chạy checkpoint TOTP</div>
            <p className="mt-2 text-sm text-text-muted">
              Chiếu QR lên projector, sinh viên join bằng điện thoại/laptop. Trong buổi làm bài, hệ thống tự autosave,
              chặn gian lận bằng checkpoint token và cho phép giảng viên theo dõi realtime.
            </p>
          </div>
        </Card>

        <Card interactive className="flex items-stretch overflow-hidden p-0">
          <div className="flex w-24 flex-col items-center justify-center gap-3 border-r border-border-subtle bg-bg-section">
            <span className="h-8 w-8 rounded-md border border-border-subtle" />
          </div>
          <div className="flex-1 p-6 md:p-7">
            <div className="text-sm font-medium text-primary">Báo cáo</div>
            <div className="mt-1 text-lg font-semibold text-text-heading">Scoreboard &amp; log cho từng buổi học</div>
            <p className="mt-2 text-sm text-text-muted">
              Sau mỗi session, xem lại scoreboard, log token và phân bố câu hỏi theo tag. Dùng dữ liệu này để tinh chỉnh
              ngân hàng câu hỏi và chiến lược giảng dạy cho những học kỳ tiếp theo.
            </p>
          </div>
        </Card>
      </div>

      {/* Lightweight social proof / use cases */}
      <Card className="p-6">
        <div className="text-sm font-medium text-text-heading">Thiết kế cho phòng học thật, không chỉ demo</div>
        <div className="mt-2 grid gap-2 text-xs text-text-muted md:grid-cols-3">
          <div>
            <div className="font-medium text-text-heading">Lớp đại cương đông sinh viên</div>
            <div>Quản lý quiz cho 100–200 sinh viên trong một buổi, không cần phát đề giấy.</div>
          </div>
          <div>
            <div className="font-medium text-text-heading">Quiz giữa kỳ / cuối kỳ</div>
            <div>Autosave + checkpoint giúp hạn chế quay cóp, giảm rủi ro mất bài.</div>
          </div>
          <div>
            <div className="font-medium text-text-heading">Lớp học thêm, CLB, workshop</div>
            <div>Dùng BKquiz để check‑in kiến thức nhanh sau mỗi buổi học.</div>
          </div>
        </div>
      </Card>

      {/* Get Started - Open Source */}
      <div className="pt-10">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-heading">Hoàn toàn miễn phí và mã nguồn mở</h2>
          <p className="mt-2 text-sm text-text-muted">
            BKquiz là dự án opensource, bạn có thể tự host hoặc sử dụng phiên bản cloud miễn phí.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Self-hosted */}
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🚀</div>
              <div>
                <div className="text-lg font-semibold text-text-heading">Self-hosted</div>
                <div className="mt-1 text-sm text-text-muted">
                  Tự host trên server của bạn, kiểm soát hoàn toàn dữ liệu
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Miễn phí 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Kiểm soát dữ liệu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Tùy chỉnh theo nhu cầu</span>
              </div>
            </div>
            <div className="mt-6">
              <Link href="https://github.com/your-org/bkquiz" target="_blank" rel="noopener noreferrer">
                <Button variant="primary" className="w-full">
                  📦 Xem trên GitHub
                </Button>
              </Link>
            </div>
          </Card>

          {/* Cloud (Free) */}
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">☁️</div>
              <div>
                <div className="text-lg font-semibold text-text-heading">Cloud (Miễn phí)</div>
                <div className="mt-1 text-sm text-text-muted">
                  Sử dụng ngay không cần setup, đăng nhập bằng Google
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Không cần setup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Đăng nhập bằng Google</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Miễn phí mãi mãi</span>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/sign-in/">
                <Button variant="primary" className="w-full">
                  🚀 Bắt đầu miễn phí
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Open Source & Community */}
      <div className="pt-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-heading">Mã nguồn mở & Cộng đồng</h2>
          <p className="mt-2 text-sm text-text-muted">
            BKquiz là dự án opensource, được phát triển vì cộng đồng giáo dục.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {/* GitHub */}
            <Card className="p-4">
              <div className="text-lg font-semibold text-text-heading">⭐ GitHub</div>
              <p className="mt-2 text-sm text-text-muted">
                Xem source code, đóng góp, hoặc report issues
              </p>
              <Link
                href="https://github.com/trungtv/bkquiz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Xem trên GitHub →
              </Link>
            </Card>

            {/* License */}
            <Card className="p-4">
              <div className="text-lg font-semibold text-text-heading">📄 License</div>
              <p className="mt-2 text-sm text-text-muted">
                Apache License 2.0 - tự do sử dụng, chỉnh sửa và phân phối với bảo vệ bằng sáng chế
              </p>
              <Link
                href="https://github.com/trungtv/bkquiz/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Xem license →
              </Link>
            </Card>

            {/* Contributing */}
            <Card className="p-4">
              <div className="text-lg font-semibold text-text-heading">🤝 Contributing</div>
              <p className="mt-2 text-sm text-text-muted">
                Đóng góp code, báo lỗi, hoặc đề xuất tính năng mới
              </p>
              <Link
                href="https://github.com/trungtv/bkquiz/blob/main/README.md#-contributing"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Hướng dẫn đóng góp →
              </Link>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="pt-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-heading">Câu hỏi thường gặp</h2>
          <p className="mt-2 text-sm text-text-muted">
            Những câu hỏi phổ biến về BKquiz
          </p>

          <div className="mt-6 space-y-3">
            {[
              {
                q: 'BKquiz có miễn phí không?',
                a: 'Có, BKquiz hoàn toàn miễn phí và mã nguồn mở. Bạn có thể sử dụng cloud version miễn phí hoặc self-host trên server của mình.',
              },
              {
                q: 'Tôi có thể tự host BKquiz không?',
                a: 'Có, BKquiz là opensource và bạn có thể tự host. Xem hướng dẫn setup trên GitHub repository. Chỉ cần Node.js, PostgreSQL và vài bước cấu hình là có thể chạy được.',
              },
              {
                q: 'Dữ liệu của tôi có an toàn không?',
                a: 'Nếu bạn self-host, bạn kiểm soát hoàn toàn dữ liệu. Cloud version sử dụng Google OAuth để xác thực và tuân thủ các tiêu chuẩn bảo mật. Dữ liệu được lưu trữ an toàn và chỉ bạn mới có quyền truy cập.',
              },
              {
                q: 'Tôi có thể đóng góp cho dự án không?',
                a: 'Rất hoan nghênh! Bạn có thể đóng góp code, báo lỗi, đề xuất tính năng, hoặc cải thiện tài liệu. Xem CONTRIBUTING.md trên GitHub để biết cách đóng góp.',
              },
              {
                q: 'BKquiz hỗ trợ bao nhiêu sinh viên trong một session?',
                a: 'BKquiz được thiết kế để hỗ trợ lớp học lớn (100-200 sinh viên). Hệ thống có thể scale tùy theo cấu hình server của bạn nếu self-host.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-md bg-bg-card shadow-card focus-visible:outline-none">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 focus-visible:outline-none">
                  <span className="text-sm font-medium text-text-heading">{q}</span>
                  <span className="text-lg text-text-muted group-open:hidden">+</span>
                  <span className="hidden text-lg text-text-muted group-open:inline">×</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-text-muted">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
