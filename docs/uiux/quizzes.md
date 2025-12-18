# 🧩 BKquiz – Quizzes & Quiz Rules

Nhóm màn hình `Quizzes` cho phép teacher quản lý quiz theo lớp, cấu hình rules theo tag/pool và preview đủ/thiếu câu hỏi trước khi start session.

---

## 1. Mục tiêu & personas

- **Persona chính**: Teacher / TA.
- **Mục tiêu**:
  - Xem danh sách quiz theo từng lớp học.
  - Tạo quiz draft nhanh và điều hướng vào trang cấu hình chi tiết.
  - Thiết lập rules same-set / variant-set, preview đủ/thiếu theo pool/tag.

---

## 2. Quizzes Panel (Dashboard → tab Quizzes)

### 2.1. Header & bộ lọc lớp

- Dropdown `Chọn lớp`:
  - Options = danh sách classroom mà user là member.
  - Label: “Chọn lớp”, helper text: “Quizzes thuộc lớp này”.
  - Hiển thị badge nhỏ classCode hiện tại ở góc phải (dùng `Badge variant="info"`).

### 2.2. Tạo quiz draft

- Nhóm form:
  - Label: “Tạo quiz (draft)”.
  - Input:
    - `Tên quiz` (placeholder: “VD: Quiz tuần 1”).
  - Button:
    - `Tạo` (primary).
    - Disabled nếu:
      - Không chọn lớp.
      - Tên rỗng.
      - Role không phải teacher/TA.
  - Behaviour:
    - Gọi `POST /api/quizzes`.
    - Nếu thành công:
      - Clear input.
      - Reload danh sách quiz.
      - Redirect tới `/dashboard/quizzes/{quizId}`.
    - Nếu lỗi:
      - Panel lỗi đỏ dưới form (message từ API).

### 2.3. Danh sách quiz

- Mỗi quiz hiển thị trong `Card` interactive:
  - Title (truncate nếu dài).
  - Dòng metadata:
    - Badge trạng thái: `draft | published | archived`.
    - Text: “Cập nhật: {updatedAt}”.
    - `rules: {ruleCount}` nếu API trả về.
  - Action:
    - Nút `Mở` (Button ghost) → `/dashboard/quizzes/{id}`.
  - Hover: border sáng, nền nhạt hơn; `cursor-pointer` toàn card.

- Empty state:
  - Text: “Chưa có quiz nào cho lớp này. Tạo quiz draft ở phía trên để bắt đầu.”

---

## 3. Quiz Detail – Rules & Preview

Màn hình chi tiết quiz phục vụ việc mapping với `docs/api.md` (quizzes, rules, preview, settings).

### 3.1. Header

- Card nhỏ hiển thị:
  - Title: “Quiz Rules (same-set / variant-set)”.
  - QuizId (font-mono, có thể rút gọn).
  - Nếu có `error` chung (ví dụ load rules/pools thất bại):
    - Panel đỏ hiển thị message chi tiết.

### 3.2. Preview đủ/thiếu theo rule

- Card “Preview đủ/thiếu theo rule”:
  - Button `Preview` (ghost) gọi `GET /api/quizzes/{quizId}/preview`.
  - Khi có dữ liệu:
    - Summary trên cùng:
      - `Tổng requested`, `Tổng poolSize`, `Thiếu`.
    - Table:
      - Cột: Tag, Requested, PoolSize, Available, Shortage, Pools.
      - Hàng thiếu (`shortage > 0`):
        - Nền amber nhạt, text cảnh báo.
  - Khi chưa có dữ liệu:
    - Text: “Bấm “Preview” để kiểm tra đủ/thiếu câu theo từng tag/pool trước khi tạo session.”

### 3.3. Bước 2 – Khung “Chọn câu” (Rule builder)

**Mục tiêu UX**: giáo viên nghĩ theo kiểu “mỗi lượt chọn câu” thay vì “định nghĩa rule kỹ thuật”.

#### 3.3.1. Khung chọn câu (1 lượt chọn)

- Card chính có tiêu đề: **“Chọn câu cho đề”**.
- Bên trong chia thành các vùng:
  - **Chọn ngân hàng câu hỏi (pool)**:
    - Select hoặc dropdown nhiều lựa chọn:
      - `Pools` (multi-select): mỗi item = tên + visibility + permission.
    - Copy nhỏ: “Bạn có thể chọn 1 hoặc nhiều ngân hàng câu hỏi.”
  - **Chọn chủ đề (tag) để lọc**:
    - Multi-select tags:
      - Cho phép chọn **nhiều tag** để filter khi lấy câu cho lượt này.
      - Gợi ý placeholder: “VD: dsa-tree, heap, graph”.
  - **Số lượng câu**:
    - Với **same-set**:
      - Field `Số câu cần lấy` (count).
    - Với **variant-set**:
      - `Số câu chung cho mọi đề` (commonCount).
      - `Số câu riêng cho mỗi đề` (variantCount).
      - (Tuỳ chọn) `Tỉ lệ câu dự phòng (%)` (extraPercent / defaultExtraPercent).
  - **Hiển thị tổng số câu đã lấy**:
    - Dòng info bên dưới:  
      - “Lượt này: dự kiến lấy **X câu** từ **Y câu khả dụng** trong pools đã chọn.”
      - Nếu thiếu: highlight màu vàng và giải thích.

- Nút ở cuối khung:
  - **`Xong lượt chọn này`** (primary):
    - Validate:
      - Phải chọn ít nhất 1 pool.
      - Phải có ít nhất 1 tag hoặc có copy “(ALL tags)” nếu để trống.
      - Số câu > 0.
    - Sau khi success:
      - Clear các control hoặc giữ lại state tuỳ lựa chọn (MVP: clear).

#### 3.3.2. Danh sách các lượt chọn đã cấu hình

- Ngay bên dưới khung chọn câu:
  - Hiển thị mỗi lượt sau khi bấm `Xong lượt chọn này` dưới dạng **card / list item**:
    - Pools đã chọn.
    - Tags filter.
    - Mode (same/variant).
    - Số câu chung / riêng / dự phòng.
    - Tổng số câu dự kiến lấy cho lượt này.
  - Người dùng có thể:
    - Thêm lượt mới bằng cách quay lại khung phía trên.
    - (Phase sau) chỉnh sửa / xoá 1 lượt.

- Tổng quan bên dưới danh sách:
  - Dòng “Tổng số câu dự kiến lấy từ tất cả lượt chọn: **N câu**”.
  - Gợi ý bấm `Preview` ở card 3.2 để kiểm tra đủ/thiếu theo tag/pool.

### 3.4. Rules hiện tại

- Danh sách rule dạng card:
  - Nội dung:
    - Tag (font-mono).
    - Mode (same/variant).
    - Với same-set: `count`.
    - Với variant-set: `commonCount`, `variantCount`, `extraPercent`.
    - Pools: list tên pool hoặc “ALL”.
  - Có thể thêm actions:
    - Edit / Delete (phase sau; MVP có thể chỉ view).

---

## 4. Kết nối với Session Runtime

- Sau khi rules hợp lệ và preview không thiếu nghiêm trọng:
  - Giáo viên sẽ dùng màn Classroom / Sessions để **start session** dựa trên quiz này.
  - Quiz Detail có thể hiển thị:
    - Badge “Có X sessions đã chạy với quiz này”.
    - Link nhanh sang danh sách sessions (phase sau).


