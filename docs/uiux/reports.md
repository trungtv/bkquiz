# 📈 BKquiz – Reports & Audit Screens

Nhóm màn hình báo cáo giúp giảng viên xem kết quả quiz và audit việc verify token.

---

## 1. Scoreboard per Session

### 1.1. Mục tiêu

- Hiển thị kết quả tổng quan cho một `QuizSession`:
  - Điểm từng sinh viên.
  - Tỉ lệ đúng/sai.
  - Thời gian nộp bài.

### 1.2. Layout

- Header:
  - Tên session, lớp, quiz.
  - Trạng thái session (`ended`).
  - Nút quay lại danh sách sessions.
- Bảng điểm:
  - Cột:
    - Student (tên + msv, font-mono cho msv).
    - Score (0–100 hoặc theo thang điểm quiz).
    - Correct/Total.
    - SubmittedAt.
    - Failed checkpoints (số lần sai token).
  - Sorting:
    - Mặc định sort theo Score giảm dần.
    - Cho phép sort theo tên hoặc submittedAt.
- Filter:
  - Search theo tên hoặc msv.

### 1.3. Empty state

- Khi chưa có attempt nào:
  - Text: “Chưa có sinh viên nào tham gia session này.”

---

## 2. Token Log

### 2.1. Mục tiêu

- Cung cấp log tối thiểu để:
  - Kiểm tra việc verify token của từng sinh viên.
  - Phát hiện pattern bất thường (sai quá nhiều, bị lock…).

### 2.2. Layout

- Header:
  - Tên session + link về Scoreboard.
- Bảng log:
  - Cột:
    - AttemptId (rút gọn, font-mono).
    - Student.
    - Checkpoint index / phase.
    - VerifiedAt.
    - FailedCount.
    - Locked? (Yes/No).
  - Hàng lỗi nhiều (`FailedCount` cao hoặc Locked) có thể tô màu nhạt (amber/red).

---

## 3. Navigation từ Dashboard/Session Detail

- Từ **Session detail**:
  - Button `Xem bảng điểm` → Scoreboard.
  - Button `Xem token log` → Token log.
- Từ Dashboard:
  - KPI “Active sessions” → danh sách sessions; từ đó đi tiếp tới detail & reports.


