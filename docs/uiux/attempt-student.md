# 📱 BKquiz – Student Attempt & Checkpoint Token

Màn hình Attempt là nơi sinh viên làm bài quiz, với cơ chế checkpoint bằng token 45s để xác nhận hiện diện.

---

## 1. Mục tiêu & personas

- **Persona**: Student.
- **Mục tiêu**:
  - Join session, chờ giảng viên bắt đầu.
  - Làm bài thoải mái trên thiết bị cá nhân (mobile-first).
  - Định kỳ bị checkpoint bằng token hiển thị trên Teacher Screen.
  - Hệ thống autosave & sync khi online, không mất dữ liệu khi rớt mạng.

---

## 2. Join session & Lobby

### 2.1. Join session

- Truy cập từ QR hoặc link join: `/join/session/{sessionId}`.
- UI:
  - Card:
    - Tên quiz.
    - Tên lớp, classCode.
    - Status session: `scheduled | active | ended`.
  - Button:
    - Nếu `scheduled` hoặc `active`:
      - `Vào làm bài` → gọi `POST /api/sessions/{id}/join` → redirect `/attempt/{attemptId}`.
    - Nếu `ended`:
      - Text: “Session đã kết thúc. Hỏi giảng viên nếu cần xem lại kết quả.”

### 2.2. Lobby (waiting room)

- Khi session chưa `active`:
  - Title: “Đang chờ giảng viên bắt đầu”.
  - Text: “Khi bắt đầu bài, hệ thống sẽ tự chuyển sang màn hình làm bài.”
  - Poll `GET /api/sessions/{id}/status` mỗi 5s để kiểm tra.

---

## 3. Attempt – Layout & Interaction

### 3.1. Top sticky bar

- Nằm dưới navbar, `sticky top-[headerHeight]`, luôn hiện khi scroll.
- Nội dung:
  - Tên quiz (truncate).
  - Metadata:
    - AttemptId rút gọn (font-mono).
    - Vị trí câu hỏi: `Câu X/Y` + phần trăm progress.
    - Thời gian tới checkpoint kế tiếp: “Checkpoint còn: Ns”.
  - Progress bar:
    - Thanh ngang, chiều cao ~8px, fill bằng màu đỏ theo % câu đã đến (X/Y).
  - Status chips:
    - Badge Online/Offline.
    - Badge Pending (số câu chưa sync).
    - Nút `Sync now` (ghost) – disabled khi offline hoặc không có pending.
    - Badge cảnh báo `Sắp tới hạn` nếu state.warning.
    - Badge `Bị block` khi đang trong trạng thái checkpoint block.

### 3.2. Question card

- Card `Card` với padding 24px:
  - Header:
    - Text `Câu X/Y`.
    - Badge `Chọn 1` (`mcq_single`) hoặc `Chọn nhiều` (`mcq_multi`).
  - Prompt:
    - Render Markdown + LaTeX + ảnh (nếu có).
  - Options:
    - Mỗi option là `label` full-width:
      - Checkbox (cho cả 2 mode để đơn giản UI) + text.
      - Hover: nền sáng hơn, border rõ.
      - Selected: border đỏ + nền đỏ nhạt, vẫn đọc được text.
    - Logic:
      - `mcq_single`: khi tick 1 option → clear các option khác.
      - `mcq_multi`: thêm/bớt vào danh sách chọn.

- Dưới options:
  - Text nhỏ: “Autosave bật: lưu local ngay lập tức, sync khi online.”
  - Navigation:
    - Nút `Trước` / `Sau` (Button ghost, size nhỏ).
    - Disable ở đầu/cuối danh sách.

### 3.3. Submit card

- Card riêng:
  - Button `Submit` (primary).
  - Text nhỏ:
    - “Chỉ submit khi online, không pending sync, và không bị checkpoint block.”
  - Disable điều kiện:
    - `busy`, `blocked`, `status !== active`, `!isOnline`, `pendingCount > 0`.

---

## 4. Checkpoint Token Modal

### 4.1. Khi nào hiển thị

- Khi `blocked = true` (theo `AttemptState` từ API):
  - `state.isLocked` hoặc đến `nextDueAt`.
  - Hoặc khi quay lại từ offline mà đã quá hạn checkpoint.

### 4.2. UI modal

- Overlay mờ toàn màn hình, chặn interaction với nền.
- Card chính:
  - Title: “Checkpoint: nhập token để tiếp tục”.
  - Text:
    - Nếu offline: “Bạn đang offline. Vui lòng online lại để verify token.”
    - Nếu locked: “Bạn đang bị lock do nhập sai nhiều lần.”
    - Nếu chỉ đến hạn: “Đến hạn verify token.”
  - Form:
    - Label `Token`.
    - Input (font-mono, width 100%).
    - Button `Verify` (danger hoặc primary).
  - Trạng thái:
    - Disabled khi `busy`, `inCooldown`, `isLocked`, `!isOnline`.
    - Dòng text “Sai: X” + “· đang cooldown 30s” khi inCooldown.

---

## 5. Offline & Sync Behaviour

- Khi mất mạng:
  - Topbar:
    - Badge chuyển sang `Offline`.
    - Nút `Sync now` disabled.
  - Attempt:
    - Vẫn cho phép chọn đáp án, lưu vào IndexedDB/localStorage.
    - Không cho submit – text giải thích rõ.

- Khi online lại:
  - Tự:
    - Gọi `loadState`, `loadQuestions`, `loadAnswers`.
    - Gửi các answer `dirty` lên server.
  - Hiển thị:
    - Thông tin `Last sync: HH:MM:SS`.
    - Nếu sync lỗi → thông báo nhỏ màu đỏ “Sync lỗi (sẽ tự thử lại khi online)”.

---

## 6. Error & Empty state

- **Error chung**:
  - Card với heading “Có lỗi”.
  - Text message từ API (ví dụ ATTEMPT_NOT_FOUND).
  - Có thể thêm nút “Quay lại Dashboard” (phase sau).

- **Không có câu hỏi**:
  - Text: “Chưa có câu hỏi trong session (cần cấu hình quiz rules + Start session để snapshot).”
  - Không hiển thị navigation & submit trong trường hợp này.


