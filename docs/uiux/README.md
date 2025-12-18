# 📘 BKquiz – Tài liệu thiết kế UI/UX

Tập tài liệu này mô tả **thiết kế giao diện & trải nghiệm người dùng** cho BKquiz, dựa trên các yêu cầu trong:

- `docs/RA.md`
- `docs/architecture.md`
- `docs/flows.md`
- `docs/api.md`
- `docs/import.md`
- `docs/security.md`

Các tài liệu kỹ thuật (API, DB, kiến trúc) giải thích *BKquiz làm gì*; bộ `docs/uiux/*` mô tả *BKquiz trông như thế nào và người dùng tương tác ra sao*.

---

## 1. Danh sách tài liệu UI/UX

- `docs/uiux/guidelines.md`  
  Nguyên tắc chung về theme, layout, typography, interaction, trạng thái (loading/error/offline).

- `docs/uiux/auth.md`  
  Sign-in, DEV bypass, chọn role.

- `docs/uiux/dashboard.md`  
  Dashboard tổng quan cho teacher, bao gồm KPI cards, quick actions, Lớp học & Sessions, Quick view.

- `docs/uiux/question-bank.md`  
  Question Bank dashboard, chi tiết pool, import Markdown/ZIP, form câu hỏi.

- `docs/uiux/quizzes.md`  
  Danh sách quiz theo lớp, chi tiết quiz (rules, settings, preview).

- `docs/uiux/session-teacher.md`  
  Flow tạo session, Teacher Screen (QR + token + countdown), màn điều khiển session cho giảng viên.

- `docs/uiux/attempt-student.md`  
  Lobby/waiting room, màn làm bài (Attempt), checkpoint token modal, offline/online behavior cho sinh viên.

- `docs/uiux/reports.md`  
  Scoreboard, token log và các màn hình report khác.

---

## 2. Cách sử dụng

- Khi thiết kế UI mới hoặc refactor:
  - Xem `guidelines.md` trước để nắm **theme + component pattern** chung.
  - Mở tài liệu tương ứng với màn hình cần làm (vd: sửa Question Bank → đọc `question-bank.md`).
- Khi phát triển backend:
  - Kết hợp tài liệu UI/UX với `docs/api.md` để đảm bảo API trả đủ dữ liệu cho từng màn.
- Khi review sản phẩm:
  - So sánh UI thực tế với tài liệu để phát hiện chênh lệch (scope creep hoặc thiếu tính năng).

---

## 3. Quy ước đặt tên & cấu trúc

- Mỗi file trong `docs/uiux/` tương ứng với **một nhóm màn hình** (flow) thay vì một route đơn lẻ.
- Trong mỗi file:
  - **Mục tiêu & personas**: giải thích màn này phục vụ ai, để làm gì.
  - **Thông tin hiển thị chính**: các khối nội dung, số liệu, form.
  - **Luồng tương tác**: các bước chính trong flow.
  - **Trạng thái quan trọng**: loading, empty state, error, offline, permission-denied.
  - **Note kỹ thuật** (nếu cần): ràng buộc từ API/DB hoặc security.


