# 🖥 BKquiz – Session Runtime (Teacher UI)

Nhóm màn hình giúp giảng viên **tạo và điều khiển quiz session trên lớp**, bao gồm Teacher Screen hiển thị QR join + token động 45s.

---

## 1. Mục tiêu & personas

- **Persona**: Teacher/TA.
- **Mục tiêu**:
  - Bắt đầu session từ một quiz đã cấu hình rules.
  - Trình chiếu màn hình Teacher Screen trong lớp (máy chiếu).
  - Theo dõi trạng thái session (đã chạy bao lâu, còn thời gian hay không, số sinh viên tham gia – phase sau).

---

## 2. Tạo session

### 2.1. Entry points

- Từ `Dashboard` → khu “Lớp học & Sessions” (`ClassroomPanel`):
  - Trong danh sách lớp, mỗi lớp có phần:
    - Input “Tên session” (VD: Quiz tuần 1).
    - Dropdown chọn quiz của lớp.
    - Button “Tạo session”.

### 2.2. UI form

- Trường dữ liệu:
  - `Tên session` – bắt buộc.
  - `Quiz` – chọn từ danh sách quiz thuộc lớp.
  - Tuỳ chọn: thời lượng, thời gian bắt đầu (phase sau).
- Hành vi:
  - Submit form gọi `POST /api/sessions`.
  - Nếu thành công:
    - Redirect tới Teacher Screen: `/dashboard/sessions/{sessionId}/teacher`.
  - Nếu lỗi:
    - Panel lỗi đỏ dưới form (vd: quiz chưa có rules hợp lệ, thiếu câu).

---

## 3. Teacher Screen

### 3.1. Layout chung

- Full-screen, nền đen, tối ưu hiển thị trên máy chiếu.
- Chia 2 cột:
  1. **Bên trái – QR join** (40–50% width):
     - QR code lớn (ít nhất 300–400px trên màn hình thông thường).
     - Text dưới QR:
       - URL join (font-mono, rút gọn nếu dài).
       - Gợi ý: “Sinh viên quét QR hoặc mở link này để join session.”
  2. **Bên phải – Token & countdown**:
     - Token hiện tại:
       - Font-mono, size rất lớn (≥ 48px).
       - Màu trắng hoặc đỏ nổi bật.
     - Countdown:
       - Số giây còn lại (`tokenStepSeconds`, mặc định 45s).
       - Thanh progress ngang hoặc vòng tròn thể hiện thời gian.
       - Text: “Token mới sau X giây”.
     - Thông tin session:
       - Tên lớp, tên quiz.
       - Thời gian bắt đầu, trạng thái (`active | ended`).

### 3.2. Behaviour

- Token tự đổi theo interval:
  - UI sử dụng polling hoặc SSE/WebSocket (phase sau), nhưng với MVP có thể:
    - Poll `GET /api/sessions/{sessionId}/teacherToken` mỗi vài giây.
  - Đồng bộ với TOTP như trong `docs/RA.md`/`docs/security.md`.
- Khi session **ended**:
  - Banner đỏ phía trên: “Session đã kết thúc”.
  - Token/QR có thể mờ đi hoặc ẩn, tránh sinh viên join muộn.

---

## 4. Session list & chi tiết (teacher)

### 4.1. Danh sách sessions

- Route: `/dashboard/sessions`.
- UI:
  - Bảng hoặc list card:
    - Tên session.
    - Lớp, quiz.
    - Trạng thái: `scheduled | active | ended`.
    - Thời gian bắt đầu/kết thúc.
  - Actions:
    - “Mở Teacher Screen” cho session active.
    - “Xem report” cho session đã kết thúc.

### 4.2. Session detail (overview)

- Card info:
  - Tên session, lớp, quiz.
  - Thời lượng thực tế, số attempt, số submit.
  - Link tới:
    - Scoreboard.
    - Token log.

---

## 5. Trạng thái & empty/error

- **Khi chưa có session**:
  - `/dashboard/sessions` hiển thị empty state:
    - “Chưa có session nào. Hãy tạo session từ màn “Lớp học & Sessions” trong Dashboard.”
- **Lỗi load token** trên Teacher Screen:
  - Hiển thị panel lỗi nhỏ ở góc, text:
    - “Không tải được token hiện tại. Vui lòng thử reload trang hoặc kiểm tra mạng.”
  - Token cũ vẫn hiển thị nếu có (để không trắng màn).


