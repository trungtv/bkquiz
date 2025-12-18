# 📥 Import câu hỏi bằng Markdown (BKquiz)

Mục tiêu: cho phép giảng viên import nhanh **question pool + tags + MCQ single/multi** bằng Markdown, hỗ trợ **hình ảnh** theo cách không “đứt link”.

## 1) Định dạng file import (khuyến nghị MVP)

### 1.0 Giới hạn import (MVP defaults)
- **Max file size**:
  - `.md`: 10MB
  - `.zip`: 50MB
- **Max số câu hỏi / 1 lần import**: 500 câu
- **Ảnh** (khi import `.zip`):
  - định dạng: `.png`, `.jpg/.jpeg`, `.webp`
  - max 5 ảnh/câu
  - max 5MB/ảnh

### 1.1 Gói import dạng `.zip` (khuyến nghị)
Cấu trúc zip:
```
questions.zip
├─ questions.md
└─ assets/
   ├─ img1.png
   └─ diagram-2.jpg
```

Trong `questions.md` bạn dùng ảnh bằng link tương đối:
```md
![alt](assets/img1.png)
```

Khi import:
- Backend giải nén `.zip`
- Upload ảnh lên storage (S3; dev dùng MinIO)
- Rewrite link `assets/...` thành URL đã upload trong nội dung question (và snapshot).

### 1.2 Import trực tiếp `.md` (không có assets)
Chỉ dùng khi:
- Không có ảnh, hoặc
- Ảnh dùng URL public sẵn: `![alt](https://...)`

## 2) Cú pháp `questions.md` (1 file = 1 question pool)

### 2.1 Nguyên tắc
- **Mỗi file `questions.md` tương ứng đúng 1 `QuestionPool`**.
- File có **pool-level front-matter** ở đầu file (khai báo thông tin pool + default).
- Sau đó, mỗi câu hỏi là một **block** ngăn cách bằng **một dòng `===`** (khuyến nghị, dễ kiểm soát).
- Hệ thống vẫn hỗ trợ format cũ (legacy): **một dòng trống + một dòng `---`**.
- Mỗi block có **YAML front-matter** (metadata của câu) + phần nội dung markdown.
- Tags là **global** (đã chốt).

### 2.2 Pool-level front-matter (đặt 1 lần ở đầu file)
```md
---
pool:
  name: "DSA - Week 1"
  visibility: "private"   # optional: private|shared
defaults:
  difficulty: 2           # optional (1..5)
  shuffleOptions: true    # optional
  points: 1               # optional
---
```

### 2.3 Schema metadata cho từng câu (front-matter)
```md
---
tags: ["stack", "array"]
type: "mcq_single"   # hoặc "mcq_multi"
difficulty: 2        # optional (override defaults)
shuffleOptions: true # optional (override defaults)
points: 1            # optional (override defaults)
---
```

### 2.4 Nội dung câu hỏi + options
Sau question front-matter:
- Nội dung question là markdown tự do.
- Options khai báo theo list; đánh dấu đáp án đúng bằng `[x]` (multi) hoặc `(x)` (single).

#### MCQ single (1 đáp án)
```md
---
tags: ["stack"]
type: "mcq_single"
---
Stack là cấu trúc dữ liệu hoạt động theo nguyên tắc nào?

(x) LIFO
( ) FIFO
( ) Random
```

#### MCQ multi (nhiều đáp án)
```md
---
tags: ["array", "complexity"]
type: "mcq_multi"
---
Chọn tất cả phát biểu đúng:

[x] Truy cập phần tử mảng theo index là O(1)
[ ] Mảng luôn chèn ở giữa là O(1)
[x] Duyệt toàn bộ mảng là O(n)
```

#### Câu hỏi có ảnh (khi import `.zip`)
```md
---
tags: ["kirchhoff"]
type: "mcq_single"
---
Quan sát sơ đồ sau:

![mạch](assets/diagram-2.jpg)

Giá trị dòng I là?

( ) 1A
(x) 2A
( ) 3A
```

### 2.5 Biểu thức toán học (LaTeX)
Markdown có thể chứa biểu thức toán học theo cú pháp LaTeX (frontend sẽ render bằng KaTeX/MathJax).

- Inline math: `\( a^2 + b^2 = c^2 \)`
- Block math:

```md
\[
\int_0^1 x^2\,dx = \frac{1}{3}
\]
```

Ví dụ câu hỏi có toán:
```md
---
tags: ["integral"]
type: "mcq_single"
---
Tính giá trị:
\[
\int_0^1 x^2\,dx
\]

( ) \( \frac{1}{2} \)
(x) \( \frac{1}{3} \)
( ) \( \frac{1}{4} \)
```

## 3) Quy tắc validate (để báo lỗi rõ ràng)
- Pool-level front-matter bắt buộc, nếu pool chưa tồn tại thì **tạo mới** pool cho teacher import.
- `tags` optional, nếu tag chưa tồn tại thì **tạo mới** (global).
- `type` bắt buộc: `mcq_single | mcq_multi`.
- Options:
  - `mcq_single`: đúng **chính xác 1** option `(x)`.
  - `mcq_multi`: đúng **>=1** option `[x]`.
  - Tối thiểu 2 options.
- Ảnh:
  - Nếu dùng đường dẫn `assets/...` thì **bắt buộc** import dạng `.zip` và file phải tồn tại.

## 4) Mapping sang DB
- Pool-level `pool.name` → `QuestionPool.name` (owner là teacher import).
- `tags[]` → upsert `Tag(normalizedName)` + gán `QuestionTag`.
- Nội dung markdown → `Question.prompt`.
- Options:
  - Lưu thứ tự `order` theo thứ tự xuất hiện.
  - `isCorrect` theo marker `(x)` hoặc `[x]`.

## 5) API import (đề xuất)
- `POST /api/pools/import`
  - input: `.zip` hoặc `.md`
  - output: số câu import thành công, danh sách lỗi theo line/block.

### 5.1 Request/Response mẫu
Request (multipart/form-data):
- `file`: `.md` hoặc `.zip`
- `poolId`: uuid (optional; nếu muốn import vào pool có sẵn, nếu không sẽ lấy `pool.name` trong file và tạo mới nếu chưa tồn tại)

Response (JSON):
```json
{
  "poolId": "uuid",
  "createdPool": true,
  "createdTags": 3,
  "importedQuestions": 42,
  "skippedQuestions": 2,
  "errors": [
    {
      "blockIndex": 5,
      "message": "mcq_single must have exactly 1 correct option",
      "hint": "Use (x) for exactly one option"
    }
  ]
}
```


