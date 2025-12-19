# 📊 Review UI/UX: Question Bank Page

**Ngày review:** 2025-01-XX  
**Trang:** `/dashboard/question-bank`  
**Component:** `QuestionBankPanel.tsx`

---

## 1️⃣ Đánh giá tổng thể (Executive Summary)

### ✅ Điểm mạnh

| Mục | Đánh giá |
|-----|----------|
| **Clarity** | ✔️ Mục đích rõ ràng: import và quản lý pools |
| **Functionality** | ✔️ Đủ chức năng cơ bản: import, list pools |
| **Consistency** | ✔️ Dùng Card, Button components nhất quán |
| **Error handling** | ✔️ Có hiển thị error messages |

**Điểm số nhanh:**  
- **UI: 7.0 / 10**  
- **UX: 6.5 / 10**

👉 **Nhận xét:** Đủ dùng cho MVP, nhưng còn nhiều cơ hội cải thiện về flow, information hierarchy, và user guidance.

---

## 2️⃣ UX Flow & Cognitive Load

### 2.1 Mental Model

**Hiện tại:**
```
User → Question Bank → Import file → Xem list pools → Click pool → Detail
```

**Model đúng**, nhưng có vấn đề:

#### ⚠️ Issue 1: Import flow chưa rõ ràng

**Hiện tại:**
- Import form nằm ngay trên cùng
- Không có hướng dẫn rõ ràng về format
- Error message hiển thị nhưng không actionable

**Vấn đề:**
- User không biết format file như thế nào
- Khi import lỗi, không biết sửa ở đâu
- Không có preview trước khi import

**Đề xuất:**
1. **Thêm link đến docs/import.md** ngay trong form
2. **Thêm "Example format"** expandable section
3. **Thêm preview** sau khi chọn file (nếu có thể parse được)
4. **Error messages** chi tiết hơn với line numbers

---

#### ⚠️ Issue 2: Pool list thiếu thông tin quan trọng

**Hiện tại hiển thị:**
- Tên pool
- Visibility (`private` / `shared`)
- Last updated (timestamp dài)

**Thiếu:**
- ❌ Số câu hỏi trong pool
- ❌ Số tags
- ❌ Owner info (nếu được share)
- ❌ Quick actions (edit, delete, share)

**Đề xuất:**
```tsx
<Card>
  <div className="flex items-center justify-between">
    <div>
      <div className="font-medium">{pool.name}</div>
      <div className="text-xs text-text-muted">
        {questionCount} câu · {tagCount} tags · {visibility}
      </div>
    </div>
    <div className="flex gap-2">
      <Button size="sm" variant="ghost">Share</Button>
      <Button size="sm" variant="ghost">Mở</Button>
    </div>
  </div>
</Card>
```

---

#### ⚠️ Issue 3: Empty state chưa actionable

**Hiện tại:**
```
"Chưa có pool nào. Hãy import từ Markdown/ZIP hoặc tạo pool mới (phase sau)."
```

**Vấn đề:**
- Message nói "tạo pool mới (phase sau)" → user không biết làm gì
- Không có CTA rõ ràng

**Đề xuất:**
```tsx
<div className="text-center py-12">
  <div className="text-lg font-medium text-text-heading mb-2">
    Chưa có question pool nào
  </div>
  <div className="text-sm text-text-muted mb-6">
    Bắt đầu bằng cách import từ Markdown/ZIP hoặc tạo pool mới
  </div>
  <div className="flex gap-3 justify-center">
    <Button variant="primary">Import từ file</Button>
    <Button variant="ghost">Tạo pool mới</Button>
  </div>
</div>
```

---

### 2.2 Information Hierarchy

#### ⚠️ Issue 4: Import form quá prominent

**Hiện tại:**
- Import form nằm ở card đầu tiên, luôn hiển thị
- Chiếm nhiều không gian ngay cả khi đã có pools

**Đề xuất:**
- **Collapsible section** hoặc **tab** để tách biệt "Import" và "Pools"
- Hoặc **button "Import"** trong header, mở modal khi cần

---

#### ⚠️ Issue 5: Thiếu breadcrumb/navigation

**Hiện tại:**
- Không có cách quay lại dashboard
- Không có context về vị trí hiện tại

**Đề xuất:**
```tsx
<nav className="mb-4 text-sm">
  <Link href="/dashboard">Dashboard</Link>
  <span className="mx-2">·</span>
  <span className="text-text-heading">Question Bank</span>
</nav>
```

---

## 3️⃣ UI – Visual & Micro-interaction

### 3.1 Card spacing & density

**Hiện tại:**
- `space-y-6` giữa các card → OK
- `p-5` trong Card → OK
- Pool list items: `px-3 py-3` → hơi chật

**Đề xuất:**
- Tăng padding pool items: `px-4 py-3`
- Thêm `gap-3` trong pool list grid

---

### 3.2 Button hierarchy

**Hiện tại:**
- "Import" button: `variant="primary"` → OK
- "Mở" button trong pool card: `variant="ghost"` → OK

**Có thể cải thiện:**
- Thêm "Tạo pool mới" button (hiện chưa có)
- Thêm quick actions: Share, Delete (với confirmation)

---

### 3.3 File input UX

**Hiện tại:**
```tsx
<input type="file" accept=".md,.zip" />
```

**Vấn đề:**
- Input mặc định không đẹp
- Không có drag & drop
- Không hiển thị tên file đã chọn

**Đề xuất:**
- Custom file input với drag & drop
- Hiển thị tên file sau khi chọn
- Thêm button "Xóa file" để reset

---

### 3.4 Error display

**Hiện tại:**
```tsx
<div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
  {error}
</div>
```

**OK**, nhưng có thể cải thiện:
- Thêm icon warning/error
- Nếu error dài, cho phép scroll
- Thêm "Dismiss" button

---

## 4️⃣ So với Design Spec (`docs/uiux/question-bank.md`)

| Yêu cầu từ spec | Hiện tại | Status |
|----------------|----------|--------|
| Header với title + description | ✅ Có | OK |
| Button "Tạo pool mới" | ❌ Chưa có | **Missing** |
| Button "Import" | ✅ Có | OK |
| Pool list với stats (số câu, số tags) | ❌ Chưa có | **Missing** |
| Visibility badge | ✅ Có | OK |
| Last updated | ✅ Có | OK |
| Click card → detail | ✅ Có | OK |
| Empty state với CTA | ⚠️ Có nhưng chưa tốt | **Needs improvement** |

---

## 5️⃣ Checklist cải thiện (Priority)

### 🔥 High Priority (Làm ngay)

- [ ] **Thêm số câu hỏi và số tags** vào pool list items
- [ ] **Cải thiện empty state** với CTA buttons rõ ràng
- [ ] **Thêm breadcrumb** navigation
- [ ] **Thêm button "Tạo pool mới"** (nếu API đã có)
- [ ] **Cải thiện file input** với drag & drop và preview tên file
- [ ] **Thêm link đến docs/import.md** trong import form

### 🚀 Medium Priority (Làm tiếp)

- [ ] **Collapsible import section** hoặc tab để tách biệt
- [ ] **Quick actions** trong pool cards (Share, Delete)
- [ ] **Better error messages** với line numbers (nếu import lỗi)
- [ ] **Preview file content** trước khi import (nếu có thể)
- [ ] **Search/filter** pools (nếu có nhiều pools)

### 💡 Low Priority (Nice to have)

- [ ] **Bulk actions** (delete multiple pools)
- [ ] **Sort options** (by name, date, question count)
- [ ] **Grid/List view toggle**
- [ ] **Import history** section

---

## 6️⃣ So với best practices (Linear / Notion / Canvas LMS)

| Tiêu chí | Hiện tại | Chuẩn 2026 |
|----------|----------|------------|
| **Clarity** | 7 | 9 |
| **Actionability** | 6 | 9 |
| **Information density** | 6 | 8 |
| **Error handling** | 7 | 9 |
| **Empty states** | 5 | 9 |

👉 **Kết luận:** Đang ở **65-70% level** của các sản phẩm chuyên nghiệp. Cần cải thiện:
- Information hierarchy
- Actionable empty states
- Better error feedback

---

## 7️⃣ Đề xuất cụ thể

### 7.1 Layout mới đề xuất

```
┌─────────────────────────────────────────┐
│ ← Dashboard · Question Bank            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Question Bank                           │
│ Quản lý question pools và import...     │
│ [Import từ file] [Tạo pool mới]        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Pools của bạn (5)                       │
│ ┌─────────────┬─────────────┐         │
│ │ Pool 1      │ 50 câu      │         │
│ │ 10 tags     │ [Share][Mở] │         │
│ └─────────────┴─────────────┘         │
└─────────────────────────────────────────┘
```

### 7.2 Import form cải thiện

```tsx
<Card>
  <div className="flex items-center justify-between mb-4">
    <h3>Import từ Markdown/ZIP</h3>
    <Link href="/docs/import.md" className="text-xs text-primary">
      Xem hướng dẫn →
    </Link>
  </div>
  
  {/* Drag & drop zone */}
  <div className="border-2 border-dashed rounded-md p-8 text-center">
    {file ? (
      <div>
        <div className="font-medium">{file.name}</div>
        <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
          Xóa
        </Button>
      </div>
    ) : (
      <div>
        <p>Kéo thả file vào đây hoặc click để chọn</p>
        <input type="file" />
      </div>
    )}
  </div>
  
  <Button variant="primary" onClick={importFile} disabled={!file}>
    Import
  </Button>
</Card>
```

---

## 8️⃣ Kết luận

**Question Bank page hiện tại:**
- ✅ **Đủ chức năng cơ bản** cho MVP
- ⚠️ **Thiếu thông tin quan trọng** (số câu, số tags)
- ⚠️ **Empty state chưa actionable**
- ⚠️ **Import flow chưa user-friendly**

**Ưu tiên cải thiện:**
1. Thêm stats vào pool list (số câu, số tags)
2. Cải thiện empty state với CTA
3. Thêm breadcrumb
4. Cải thiện file input UX

Sau khi cải thiện, page này sẽ đạt **8.5/10** về UX.

