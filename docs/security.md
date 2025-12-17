# 🔐 Security & Permission (BKquiz)

## 1) Authentication
- Bắt buộc login.
- Google OAuth (MVP), thiết kế sẵn để mở rộng SSO trường.

## 2) Authorization (RBAC + membership)
- Role hệ thống: `teacher`, `student`.
- Quyền thao tác dựa trên:
  - role
  - membership trong `Classroom`
  - quyền trên `QuestionPool` (owner/share/group)

## 3) Permission matrix (tóm tắt)
### 3.1 Classroom
- Teacher owner:
  - create/update class, create quiz, start session, xem report.
- Student:
  - join class, join session, answer/submit.

### 3.2 QuestionPool
- Owner: full quyền.
- Shared:
  - `view`: xem pool + câu hỏi + đáp án.
  - `use`: view + được dùng trong quiz/rules.
  - `edit`: use + CRUD question/option/tag (soft-delete).

## 4) Token & anti-abuse
- TOTP stepSeconds cấu hình được (ví dụ 45s); verify cho phép lệch **±1 window** (theo thông lệ TOTP).
- Rate limit verify token theo `attemptId`.
- Giới hạn số lần sai (`failedCount`) theo checkpoint.
- Cooldown + lock attempt:
  - Nếu sai liên tiếp: tăng `failedCount` và đặt `cooldownUntil`.
  - Nếu vượt ngưỡng: đặt `lockedUntil` hoặc `status='locked'` (không cho làm/submit cho đến khi hết lock).
  - Default đề xuất (đơn giản, đủ dùng):
    - `maxFailedPerCheckpoint = 6`
    - `cooldownAfterFailed = 3` lần sai → `cooldownSeconds = 30`
    - `lockAfterFailed = 6` lần sai → `lockMinutes = 5`

## 5) Audit & immutability (freeze theo session)
- Khi start session:
  - materialize câu hỏi + snapshot để đảm bảo lịch sử.
- Sau khi session start:
  - sửa pool/question/option không ảnh hưởng session.

## 6) Data hygiene
- Soft-delete question/option để tránh gãy lịch sử.
- Index các trường hot: classCode, tag pivot, poolId, sessionId, attemptId.

## 7) Mất mạng / quay lại (offline behavior)
- Frontend nên **cache answers local** (localStorage/IndexedDB) và retry gửi lại khi online.
- Backend là nguồn sự thật:
  - Khi quay lại, `GET /api/attempts/:attemptId/state` trả về `blocked`, `dueAt`, `lockedUntil` để UI render đúng trạng thái.
- Nếu mất mạng đúng lúc đến hạn checkpoint:
  - Khi online lại, nếu `now >= dueAt` thì attempt bị **blocked** ngay và bắt verify token.


