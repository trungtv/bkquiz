# 📚 BKquiz – Question Bank & Import Markdown

Question Bank là nơi giảng viên quản lý toàn bộ **question pools**, tạo/sửa câu hỏi và import nhanh từ Markdown/ZIP.

---

## 1. Mục tiêu & personas

- **Persona chính**: Teacher (owner), teacher được share pool (`view | use | edit`).
- **Mục tiêu**:
  - Xem tất cả question pools mình sở hữu hoặc được share.
  - Tạo pool mới / chỉnh sửa / chia sẻ.
  - Tạo, sửa, xoá mềm câu hỏi.
  - Import nhanh hàng trăm câu hỏi từ file `questions.md` (và ảnh trong `.zip`).

---

## 2. Question Bank Dashboard

### 2.1. Layout

- **Header**:
  - Title: `Question Bank`.
  - Description ngắn: “Quản lý question pools, tags, và import câu hỏi bằng Markdown.”
  - Actions:
    - `Tạo pool mới` (Button primary → form tạo pool).
    - `Import từ Markdown/ZIP` (Button ghost → mở modal upload).

- **Danh sách pools**:
  - Grid hoặc list dọc (Card interactive):
    - Tên pool.
    - Visibility: `private | shared` (Badge).
    - Số câu hỏi, số tags.
    - Last updated.
    - Owner/permission (nếu được share).
  - Hover: border sáng + nền nhích nhẹ.
  - Click card → màn chi tiết pool.

### 2.2. Empty state

- Khi chưa có pool:
  - Panel lớn ở giữa:  
    “Chưa có question pool nào. Hãy tạo pool mới hoặc import từ Markdown.”
  - Nút `Tạo pool mới` và `Import từ Markdown/ZIP` ngay trong empty state.

---

## 3. Pool Detail

### 3.1. Info header

- Hiển thị trong card trên cùng:
  - Tên pool (editable nếu có quyền `edit`).
  - Visibility + permission (`owner`, `view`, `use`, `edit`).
  - Thông tin thống kê: số câu, số tags, last updated.
  - Actions:
    - Chỉnh sửa metadata (đổi tên, visibility).
    - Quản lý share (thiết lập quyền).

### 3.2. Tabs nội dung

Gợi ý chia thành 2 tab (có thể là section trong cùng card):

1. **Questions**:
   - Danh sách câu hỏi trong pool:
     - Cột: `#`, Prompt (1–2 dòng đầu), Tags (badge), Type (`mcq_single | mcq_multi`), Difficulty, Points.
   - Actions:
     - `Thêm câu hỏi` (Button primary).
     - `Import từ Markdown` (Button ghost).
   - Hover trên từng hàng: nền nhạt hơn; click mở form edit câu hỏi.

2. **Import history** (phase sau, optional):
   - Hiển thị các lần import gần đây, kết quả, lỗi (nếu cần debug).

---

## 4. Form câu hỏi (create/edit)

### 4.1. Layout

- Dạng card hoặc side sheet:
  - Trên cùng: heading `Tạo câu hỏi mới` / `Chỉnh sửa câu hỏi`.
  - Body chia thành:
    1. Metadata:
       - `Tags` (multi-select hoặc chips).
       - `Type`: radio `mcq_single` / `mcq_multi`.
       - `Difficulty`, `Points`, `shuffleOptions`.
    2. Prompt:
       - Textarea lớn (Markdown), hỗ trợ hiển thị LaTeX như mô tả trong `docs/import.md`.
    3. Options:
       - Danh sách option:
         - Input text per option.
         - Checkbox/radio để đánh dấu đáp án đúng.
         - Drag & drop reorder (phase sau, không bắt buộc MVP).

### 4.2. Validation & UX

- `mcq_single`:
  - Phải có chính xác 1 đáp án đúng → hiển thị error rõ ràng nếu hơn/ít hơn.
- `mcq_multi`:
  - Phải có ít nhất 1 đáp án đúng.
- Tối thiểu 2 options.
- Khi lưu lỗi:
  - Hiển thị panel đỏ phía trên form, message rõ ràng (gần với rule trong `docs/import.md`).

---

## 5. Import từ Markdown/ZIP

### 5.1. Upload panel

- Có thể đặt trong modal hoặc section riêng:
  - Dropzone: “Kéo thả `.md` hoặc `.zip` vào đây, hoặc bấm để chọn file.”
  - Text mô tả, bám đúng spec trong `docs/import.md`:
    - Mỗi file `questions.md` = 1 pool.
    - Delimiter `===` giữa các câu hỏi.
    - Pool-level front-matter ở đầu file.
    - Hỗ trợ ảnh với cấu trúc `assets/` trong `.zip`.
  - Field optional:
    - `poolId` (nếu muốn import vào pool có sẵn, override metadata `pool.name`).

### 5.2. Sau khi upload

- Hiển thị kết quả dạng card:
  - `poolId`, `createdPool` (true/false).
  - `createdTags`, `importedQuestions`, `skippedQuestions`.
  - Danh sách `errors[]` (nếu có):
    - Mỗi error: blockIndex, message, hint.
  - Màu:
    - Success: nền xanh nhạt hoặc badge success.
    - Error: panel đỏ, text dễ đọc, khi nhiều lỗi nên cho phép scroll.

### 5.3. Behaviour kỹ thuật

- Frontend gửi `multipart/form-data` tới `POST /api/pools/import`.
- Nếu server trả về plain-text/do lỗi không phải JSON:
  - UI phải handle gracefully (đã có logic fallback trong code), hiển thị message “IMPORT_FAILED” hoặc text thô.

---

## 6. Security & Permission (UI level)

- Hành động `edit`, `share`, `delete` chỉ hiển thị nếu:
  - User là owner hoặc có permission tương ứng (dựa trên dữ liệu từ API).
- Với người chỉ có quyền `view`:
  - Ẩn hoặc disable các CTA thay đổi dữ liệu, hiển thị tag “Read-only” trong header pool.


