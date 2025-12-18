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
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/sign-in/">
            <Button variant="primary">Bắt đầu với Google (miễn phí)</Button>
          </Link>
          <Link href="/dashboard/">
            <Button variant="ghost">Xem thử Dashboard demo</Button>
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

      {/* Pricing – reference-style */}
      <div className="pt-10">
        <div className="text-center text-sm text-text-muted">
          Start your journey now and let your Framer template business take off.
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-0">
            <div className="flex h-full flex-col p-6">
              <div className="text-base font-semibold text-text-heading">Full Course</div>

              <div className="mt-4 flex items-end gap-3">
                <div className="text-4xl font-semibold tracking-tight text-text-heading">$149</div>
                <div className="pb-1 text-sm text-text-muted">USD</div>
              </div>
              <div className="mt-2 text-sm text-text-muted line-through">$199</div>

              <div className="mt-6 space-y-3 text-sm text-text-body">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-heading">✓</span>
                  <span>Access all lessons</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-heading">✓</span>
                  <span>Future updates included</span>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <Button variant="primary" className="w-full">
                  Get access now
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex h-full flex-col p-6">
              <div className="text-base font-semibold text-text-heading">Mentoring</div>

              <div className="mt-4 flex items-end gap-3">
                <div className="text-4xl font-semibold tracking-tight text-text-heading">$299</div>
                <div className="pb-1 text-sm text-text-muted">USD</div>
              </div>
              <div className="mt-2 text-sm text-text-muted line-through">$399</div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3 text-text-muted">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated/50">✓</span>
                  <span>Access full course</span>
                </div>
                <div className="flex items-center gap-3 text-text-muted">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated/50">✓</span>
                  <span>Future updates included</span>
                </div>
                <div className="flex items-center gap-3 text-text-body">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-heading">＋</span>
                  <span>1h mentoring call to AMA</span>
                  <span className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs text-text-muted">?</span>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <Button variant="primary" className="w-full">
                  Get access now
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex h-full flex-col p-6">
              <div className="text-base font-semibold text-text-heading">Co-Pilot</div>

              <div className="mt-4 flex items-end gap-3">
                <div className="text-4xl font-semibold tracking-tight text-text-heading">$699</div>
                <div className="pb-1 text-sm text-text-muted">USD</div>
              </div>
              <div className="mt-2 text-sm text-text-muted line-through">$899</div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3 text-text-muted">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated/50">✓</span>
                  <span>Access full course</span>
                </div>
                <div className="flex items-center gap-3 text-text-muted">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated/50">✓</span>
                  <span>Future updates included</span>
                </div>
                <div className="flex items-center gap-3 text-text-body">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-heading">＋</span>
                  <span>1h mentoring call to AMA</span>
                  <span className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs text-text-muted">?</span>
                </div>
                <div className="flex items-center gap-3 text-text-body">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-heading">＋</span>
                  <span>Template review by Cédric</span>
                  <span className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs text-text-muted">?</span>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <Button variant="primary" className="w-full">
                  Get access now
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm text-text-muted">
          Refunds will not be issued.
        </div>
      </div>

      {/* FAQ – reference-style */}
      <div className="pt-10">
        <div className="mx-auto max-w-4xl">
          <div className="text-3xl font-semibold tracking-tight text-text-heading">
            You seem either very interested, or have questions.
            <br />
            Here are a few answers.
          </div>

          <div className="mt-6 space-y-3">
            {[
              'Who is this course for?',
              'Do I need any knowledge in Framer before taking this course?',
              'Will this course teach me how to use Framer?',
            ].map(q => (
              <details key={q} className="group rounded-md bg-bg-card shadow-card focus-visible:outline-none">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 focus-visible:outline-none">
                  <span className="text-sm font-medium text-text-heading">{q}</span>
                  <span className="text-lg text-text-muted group-open:hidden">+</span>
                  <span className="hidden text-lg text-text-muted group-open:inline">×</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-text-muted">
                  Nội dung trả lời sẽ được bổ sung theo nhu cầu của BKquiz. (Placeholder)
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
