# 🎨 BKquiz – UI/UX Guidelines Chung

Tài liệu này định nghĩa **nguyên tắc giao diện & trải nghiệm** dùng chung cho toàn bộ sản phẩm BKquiz.

---

## 1. Thương hiệu & Theme

- **Product type**: SaaS dashboard cho giảng viên + quiz app cho sinh viên.
- **Phong cách**: Dark theme, chuyên nghiệp, hiện đại, không quá “game”.
- **Tông màu chính (red–black)** – khớp với các CSS token trong `src/styles/global.css`:
  - Nền gốc: gần đen (charcoal / slate rất đậm).
  - Nền card: dark grey với border rõ.
  - Primary: đỏ tươi (CTA chính).
  - Accent: đỏ nhạt / cam cho hover, highlight.
  - Text: trắng/xám sáng; muted text xám nhạt hơn.

Nguyên tắc: **ít màu nhưng dùng nhất quán** – đỏ chỉ dùng cho CTA quan trọng, status, checkpoint; không dùng cho nội dung bình thường.

---

## 2. Layout & Lưới

- **Container chính**:
  - `max-w-6xl`, margin auto, padding ngang 16px (mobile) – 24px (desktop).
  - Navbar cố định trên cùng (`sticky top-0`), main content có `padding-top` đủ để không bị che.
- **Card**:
  - Dùng component `Card` với class nền & border thống nhất.
  - Padding: 16–24px tuỳ cấp độ (dashboard thường dùng 20–24px).
  - Card **interactive**:
    - Có `cursor-pointer`.
    - Hover: border sáng hơn, background nhích nhẹ (không scale transform gây layout shift).
- **Responsive**:
  - Mobile-first, 1 cột; ở breakpoint md/lg mới chia grid 2–3 cột.
  - Không được có horizontal scroll trên mobile cho nội dung chính (trừ bảng report, có thể scroll ngang trong `TableWrap`).

---

## 3. Typography

- Font chính: Inter (body, heading), JetBrains Mono (code, id, token, classCode).
- Hệ thống cỡ chữ:
  - Heading trang: 24px–28px, `font-semibold`, `tracking-tight`.
  - Heading card: 16px–18px, `font-semibold`.
  - Body text: 14px.
  - Caption / helper text: 12px.
- Dùng **màu** để phân cấp:
  - Heading: trắng hoặc xám rất sáng.
  - Subheading / mô tả: `text-slate-400`.
  - Helper / caption / metadata: `text-slate-500` hoặc `text-slate-400` tuỳ nền.

---

## 4. Components & Interaction

### 4.1 Button

- Dùng component `Button` với các `variant`:
  - `primary`: CTA chính (Tạo lớp, Tạo quiz, Submit, Start session…).
  - `ghost`: hành động phụ (Xem chi tiết, Mở, Preview, Sync now).
  - `danger`: hành động destructive hoặc checkpoint nhạy cảm (Verify token, Lock…).
- Trạng thái:
  - `disabled` luôn có `opacity-50` + không hover.
  - Loading (nếu có) hiển thị text “Đang …”.

### 4.2 Badge

- Dùng cho trạng thái ngắn: `success`, `warning`, `danger`, `info`, `neutral`.
- Chính sách:
  - `success`: published / online / running.
  - `warning`: sắp đến hạn checkpoint, shortage, cảnh báo.
  - `danger`: locked, error.
  - `info`: trạng thái trung lập nhưng hữu ích (in your classes, question pools count…).

### 4.3 Form & Input

- Tất cả input phải có:
  - `label` rõ ràng (text, không placeholder-only).
  - Optional helper text bên dưới nếu cần giải thích.
- Sử dụng component `Input` cho hầu hết input text/number.
- Label/placeholder:
  - Label: tiếng Việt, ngắn gọn, capital hợp lý.
  - Placeholder dùng ví dụ cụ thể: “VD: DSA K66”, “VD: Quiz tuần 1”.

### 4.4 Trạng thái mạng & sync

- Các màn có autosave (Attempt) cần luôn hiển thị:
  - Badge Online/Offline.
  - Số answer đang pending sync.
  - Thời gian last sync (nếu có).
- Khi offline:
  - Cho phép chọn đáp án / nhập liệu.
  - Không cho submit; text giải thích vì sao.

---

## 5. States: Loading, Empty, Error

- **Loading**:
  - Dùng `Skeleton` component cho layout phức tạp.
  - Với card đơn: text “Đang tải…” trong card.
- **Empty state**:
  - Luôn có 1 câu mô tả + gợi ý hành động (Ví dụ: “Chưa có quiz nào. Tạo quiz draft ở phía trên để bắt đầu.”).
  - Icon có thể thêm sau; MVP ưu tiên copy rõ ràng.
- **Error state**:
  - Panel border đỏ, nền đỏ nhạt (có phiên bản dark).
  - Text lỗi ngắn, phía dưới có thể có chi tiết hoặc mã lỗi (font-mono).

---

## 6. Accessibility & Usability

- Tối thiểu:
  - Contrast đủ (4.5:1) cho text chính.
  - Hit area nút tối thiểu ~40px chiều cao.
  - Không dùng màu là tín hiệu duy nhất (kết hợp icon/label/text).
- Keyboard:
  - Form và nút chính có thể focus & kích hoạt bằng bàn phím.
  - Modal checkpoint phải trap focus khi mở.

---

## 7. Phân biệt Teacher vs Student

- **Teacher**:
  - Nhiều số liệu, bảng, filter, action management.
  - Ngôn ngữ: “Tạo”, “Quản lý”, “Preview”, “Report”.
- **Student**:
  - Ít distraction: chỉ câu hỏi, options, timer/checkpoint.
  - Ngôn ngữ: “Vào làm bài”, “Tiếp tục”, “Nộp bài”.

Khi thiết kế màn hình mới, luôn xác định rõ **persona chính** trước, sau đó áp dụng tone & layout phù hợp.


