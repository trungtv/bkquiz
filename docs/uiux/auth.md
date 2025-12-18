# 🔑 BKquiz – Auth & Dev Bypass

Tài liệu này mô tả UI/UX cho quá trình đăng nhập và chế độ DEV bypass (chọn role nhanh khi develop).

---

## 1. Sign-in

### 1.1. Mục tiêu & personas

- Cho phép:
  - Giảng viên đăng nhập bằng Google (hoặc tài khoản trường trong tương lai).
  - Sinh viên đăng nhập nhanh, không cần tạo tài khoản thủ công.

### 1.2. Layout

- Nền dark theme, card đăng nhập ở giữa:
  - Logo BKquiz nhỏ.
  - Title: “Đăng nhập”.
  - Subtitle: “Quiz trên lớp với token 45s”.
  - Button chính:
    - “Đăng nhập với Google” (primary).
  - Dưới nút:
    - Text nhỏ: “Chúng tôi chỉ dùng email để nhận diện tài khoản BK và lưu kết quả quiz.”

### 1.3. Trạng thái & lỗi

- Loading:
  - Khi gọi `signIn('google')`, ẩn bớt các hành động khác hoặc disable nút, text “Đang chuyển tới Google…”.
- Lỗi:
  - `MissingSecret` hoặc lỗi config: hiển thị hộp lỗi rõ ràng (chủ yếu phục vụ dev/QA).
  - Lỗi auth thông thường: “Không đăng nhập được. Thử lại hoặc liên hệ quản trị viên.”

---

## 2. Dev Bypass & Chọn role

### 2.1. Bối cảnh

- Khi `DEV_BYPASS_AUTH=1`, hệ thống cho phép:
  - Bỏ qua Auth.js thực, dùng cookie `bkquiz_dev_role`.
  - Chọn role `teacher | student` để chạy nhanh flow demo.

### 2.2. Màn `/dev/role`

- Card giữa màn:
  - Title: “Chế độ DEV – chọn role”.
  - Description: “Dùng tạm trong môi trường phát triển, không áp dụng cho production.”
  - Hai button lớn:
    - “Vào với role Teacher”.
    - “Vào với role Student”.
  - Behaviour:
    - Bấm nút sẽ gọi `/api/dev/role?role=teacher|student&next=/[locale]/dashboard`.
    - Sau khi set cookie, redirect tới dashboard.

### 2.3. Indicator trong UI

- Khi đang ở chế độ DEV:
  - Ở Navbar hoặc Dashboard header nên có text nhỏ:
    - “DEV mode – role: Teacher/Student”.
  - Có button `DEV: đổi role` trên dashboard (đã có), dẫn về `/dev/role`.


