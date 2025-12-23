# Landing Page Improvements for Open Source Product

## 🎯 Mục tiêu
Cải tiến landing page để phù hợp với sản phẩm **opensource, miễn phí** thay vì commercial product.

---

## ❌ Vấn đề hiện tại

### 1. **Pricing Section** (Lines 158-271)
- ❌ Có 3 pricing tiers: Full Course ($149), Mentoring ($299), Co-Pilot ($699)
- ❌ Text: "Start your journey now and let your Framer template business take off" - không liên quan
- ❌ "Refunds will not be issued" - không phù hợp với free product

### 2. **FAQ Section** (Lines 273-301)
- ❌ Questions về "Framer template" không liên quan đến BKquiz
- ❌ "Who is this course for?" - không phù hợp với quiz platform

### 3. **Header Tagline**
- ❌ "Starter code for your Nextjs Boilerplate with Tailwind CSS" - template boilerplate text

### 4. **Thiếu Open Source Elements**
- ❌ Không có GitHub link/badge
- ❌ Không có license info
- ❌ Không có contribution section
- ❌ Không có self-hosted option
- ❌ Không có community links

---

## ✅ Đề xuất cải tiến

### 1. **Thay Pricing Section → "Get Started" Section**

**Thay thế pricing cards bằng:**

```tsx
{/* Get Started - Open Source */}
<div className="pt-10">
  <div className="text-center">
    <h2 className="text-2xl font-semibold text-text-heading">
      Hoàn toàn miễn phí và mã nguồn mở
    </h2>
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
        <Link href="https://github.com/trungtv/bkquiz">
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
```

### 2. **Thay FAQ Section → Open Source & Community Section**

```tsx
{/* Open Source & Community */}
<div className="pt-10">
  <div className="mx-auto max-w-4xl">
    <h2 className="text-2xl font-semibold tracking-tight text-text-heading">
      Mã nguồn mở & Cộng đồng
    </h2>
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
        <Link href="https://github.com/trungtv/bkquiz" className="mt-3 inline-block text-sm text-primary">
          Xem trên GitHub →
        </Link>
      </Card>

      {/* License */}
      <Card className="p-4">
        <div className="text-lg font-semibold text-text-heading">📄 License</div>
        <p className="mt-2 text-sm text-text-muted">
          Apache License 2.0 - tự do sử dụng, chỉnh sửa và phân phối
        </p>
        <Link href="https://github.com/trungtv/bkquiz/blob/main/LICENSE" className="mt-3 inline-block text-sm text-primary">
          Xem license →
        </Link>
      </Card>

      {/* Contributing */}
      <Card className="p-4">
        <div className="text-lg font-semibold text-text-heading">🤝 Contributing</div>
        <p className="mt-2 text-sm text-text-muted">
          Đóng góp code, báo lỗi, hoặc đề xuất tính năng mới
        </p>
        <Link href="https://github.com/trungtv/bkquiz/blob/main/CONTRIBUTING.md" className="mt-3 inline-block text-sm text-primary">
          Hướng dẫn đóng góp →
        </Link>
      </Card>
    </div>

    {/* FAQ thực sự về BKquiz */}
    <div className="mt-10">
      <h3 className="text-xl font-semibold text-text-heading">Câu hỏi thường gặp</h3>
      <div className="mt-4 space-y-3">
        {[
          {
            q: 'BKquiz có miễn phí không?',
            a: 'Có, BKquiz hoàn toàn miễn phí và mã nguồn mở. Bạn có thể sử dụng cloud version miễn phí hoặc self-host trên server của mình.',
          },
          {
            q: 'Tôi có thể tự host BKquiz không?',
            a: 'Có, BKquiz là opensource và bạn có thể tự host. Xem hướng dẫn setup trên GitHub repository.',
          },
          {
            q: 'Dữ liệu của tôi có an toàn không?',
            a: 'Nếu bạn self-host, bạn kiểm soát hoàn toàn dữ liệu. Cloud version sử dụng Google OAuth và tuân thủ các tiêu chuẩn bảo mật.',
          },
          {
            q: 'Tôi có thể đóng góp cho dự án không?',
            a: 'Rất hoan nghênh! Bạn có thể đóng góp code, báo lỗi, đề xuất tính năng, hoặc cải thiện tài liệu. Xem CONTRIBUTING.md trên GitHub.',
          },
        ].map(({ q, a }) => (
          <details key={q} className="group rounded-md bg-bg-card shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
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
```

### 3. **Cập nhật Header Tagline**

**Thay:**
```tsx
<div className="text-sm text-text-muted">Starter code for your Nextjs Boilerplate with Tailwind CSS</div>
```

**Bằng:**
```tsx
<div className="text-sm text-text-muted">Open source classroom quiz platform · 100% free</div>
```

### 4. **Thêm GitHub Badge vào Hero Section**

```tsx
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
    className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-body hover:bg-bg-elevated"
  >
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
    <span>GitHub</span>
    <span className="text-xs text-text-muted">⭐</span>
  </Link>
</div>
```

### 5. **Cập nhật Footer**

**Thêm GitHub link và license info:**

```tsx
<footer className="mt-10 border-t border-border-subtle pt-6">
  <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
    <div className="text-sm text-text-muted">
      © 2025 BKquiz. Made with ❤️ for education.
      {' '}
      <Link href="https://github.com/trungtv/bkquiz" className="text-primary hover:underline">
        Open source on GitHub
      </Link>
      {' '}
      · Apache License 2.0
    </div>
    <div className="flex items-center gap-4">
      <Link href="https://github.com/trungtv/bkquiz" className="text-sm text-text-muted hover:text-text-heading">
        GitHub
      </Link>
      <Link href="/docs" className="text-sm text-text-muted hover:text-text-heading">
        Documentation
      </Link>
      <Link href="https://github.com/trungtv/bkquiz/issues" className="text-sm text-text-muted hover:text-text-heading">
        Report Issue
      </Link>
    </div>
  </div>
</footer>
```

---

## 📋 Checklist Implementation

- [ ] Xóa pricing section (lines 158-271)
- [ ] Thay bằng "Get Started" section với self-hosted và cloud options
- [ ] Cập nhật FAQ section với questions về BKquiz
- [ ] Thêm Open Source & Community section
- [ ] Cập nhật header tagline
- [ ] Thêm GitHub badge vào hero section
- [ ] Cập nhật footer với GitHub links
- [ ] Thêm license info
- [ ] Test responsive design
- [ ] Verify all links work

---

## 🎨 Design Principles

1. **Emphasize "Free"**: Luôn nhấn mạnh "miễn phí", "opensource"
2. **GitHub First**: GitHub link nổi bật, dễ tìm
3. **Self-hosted Option**: Làm rõ option tự host
4. **Community**: Highlight contribution và community
5. **Transparency**: License, source code, roadmap công khai

---

## 📝 Notes

- Thay `trungtv/bkquiz` bằng GitHub repository URL thực tế
- Có thể thêm GitHub stars count nếu có API
- Có thể thêm "Sponsor" button nếu muốn nhận donations
- Có thể thêm "Roadmap" section để show planned features
