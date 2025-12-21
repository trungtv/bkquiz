# 📊 Review UI/UX: Question Pool Detail Page

**Ngày review:** 2025-01-XX  
**Trang:** `/dashboard/question-bank/[poolId]`  
**Component:** `QuestionPoolDetail.tsx`

---

## 1️⃣ Đánh giá tổng thể (Executive Summary)

### ✅ Điểm mạnh

| Mục | Đánh giá |
|-----|----------|
| **Functionality** | ✔️ Đủ chức năng cơ bản: xem pool, thêm câu, share |
| **Data display** | ✔️ Hiển thị đầy đủ thông tin câu hỏi |
| **Error handling** | ✔️ Có hiển thị error messages |

**Điểm số nhanh:**  
- **UI: 5.5 / 10**  
- **UX: 5.0 / 10**

👉 **Nhận xét:** Trang này còn rất sơ khai, thiếu nhiều tính năng và UX tốt. Cần cải thiện đáng kể để đạt production-ready.

---

## 2️⃣ UX Flow & Cognitive Load

### 2.1 Mental Model

**Hiện tại:**
```
User → Pool Detail → Xem pool info → Thêm câu hỏi (quick form) → Share pool
```

**Vấn đề:**
- ❌ Không có breadcrumb → user không biết đang ở đâu
- ❌ Header pool quá đơn giản, thiếu thông tin quan trọng
- ❌ Form thêm câu hỏi quá "quick" → không đủ cho production
- ❌ Không có cách edit/delete câu hỏi
- ❌ Không có cách edit pool metadata (tên, visibility)

---

### 2.2 Vấn đề UX chính

#### ⚠️ Issue 1: Header pool quá đơn giản

**Hiện tại:**
```tsx
<div className="text-lg font-semibold">
  Pool: <span className="font-mono">{props.poolId}</span>
</div>
<div>{pool?.name} ({pool?.visibility})</div>
```

**Thiếu:**
- ❌ Stats: số câu hỏi, số tags
- ❌ Last updated date
- ❌ Owner info
- ❌ Permission badge (owner/view/use/edit)
- ❌ Actions: Edit pool name, Edit visibility
- ❌ Breadcrumb navigation

**Đề xuất:**
```tsx
<Card className="p-5 md:p-6">
  {/* Breadcrumb */}
  <nav className="mb-4 text-sm text-text-muted">
    <Link href="/dashboard">Dashboard</Link>
    <span className="mx-2">·</span>
    <Link href="/dashboard/question-bank">Question Bank</Link>
    <span className="mx-2">·</span>
    <span className="text-text-heading">{pool?.name}</span>
  </nav>

  {/* Header */}
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-text-heading">{pool?.name}</h1>
      <div className="mt-2 flex items-center gap-3 text-sm text-text-muted">
        <Badge variant="neutral">{pool?.visibility}</Badge>
        <Badge variant="info">{permission}</Badge>
        <span>{questionCount} câu</span>
        <span>·</span>
        <span>{tagCount} tags</span>
        <span>·</span>
        <span>Cập nhật: {formatDate(pool?.updatedAt)}</span>
      </div>
    </div>
    {canEdit && (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm">Chỉnh sửa pool</Button>
      </div>
    )}
  </div>
</Card>
```

---

#### ⚠️ Issue 2: Form thêm câu hỏi quá "quick" và không đầy đủ

**Hiện tại:**
- Chỉ có 4 input fields (A, B, C, D) → không linh hoạt
- Không có cách thêm/xóa options động
- `mcq_multi` chưa hỗ trợ set multiple correct answers
- Không có validation feedback rõ ràng
- Không có preview câu hỏi trước khi lưu

**Vấn đề:**
- User không thể tạo câu hỏi với > 4 options
- User không thể tạo câu hỏi multi-correct đúng cách
- UX không professional

**Đề xuất:**
1. **Dynamic options list** với button "Thêm option"
2. **Checkbox cho multi-correct** khi `type === 'mcq_multi'`
3. **Validation feedback** rõ ràng
4. **Preview section** để xem câu hỏi trước khi lưu
5. **Collapsible form** hoặc modal để không chiếm quá nhiều không gian

---

#### ⚠️ Issue 3: Danh sách câu hỏi thiếu tính năng

**Hiện tại:**
- Chỉ hiển thị read-only
- Không có cách edit/delete
- Không có search/filter
- Không có pagination (nếu có nhiều câu)
- Không có sort options

**Thiếu:**
- ❌ Edit button cho mỗi câu
- ❌ Delete button (với confirmation)
- ❌ Search box
- ❌ Filter by tag
- ❌ Filter by type
- ❌ Pagination hoặc virtual scrolling

**Đề xuất:**
```tsx
<Card>
  <div className="flex items-center justify-between mb-4">
    <h2>Câu hỏi ({questions.length})</h2>
    <div className="flex gap-2">
      <Input placeholder="Tìm kiếm..." />
      <Button variant="ghost" size="sm">Lọc theo tag</Button>
      <Button variant="primary" size="sm">Thêm câu hỏi</Button>
    </div>
  </div>
  
  {/* Questions list với edit/delete actions */}
</Card>
```

---

#### ⚠️ Issue 4: Share section chưa tốt

**Hiện tại:**
- Form share đơn giản
- Danh sách share hiển thị nhưng không có cách unshare
- Không có permission management tốt

**Thiếu:**
- ❌ Unshare button
- ❌ Edit permission button
- ❌ Better display của shared users (name, email, permission, date)

**Đề xuất:**
```tsx
<div className="flex items-center justify-between">
  <div>
    <div className="font-medium">{user.name || user.email}</div>
    <div className="text-xs text-text-muted">
      {permission} · Shared {formatDate(createdAt)}
    </div>
  </div>
  <div className="flex gap-2">
    <Button size="sm" variant="ghost">Đổi quyền</Button>
    <Button size="sm" variant="ghost" onClick={handleUnshare}>Gỡ share</Button>
  </div>
</div>
```

---

### 2.3 Information Hierarchy

#### ⚠️ Issue 5: Layout không rõ ràng

**Hiện tại:**
- Pool info ở trên
- 2 columns: "Thêm câu hỏi" và "Share pool"
- Questions list ở dưới

**Vấn đề:**
- Form "Thêm câu hỏi" quá prominent → chiếm 50% màn hình
- Không có tabs/sections rõ ràng
- Khó scan thông tin

**Đề xuất:**
- **Tabs layout:**
  - Tab 1: "Questions" (list + form thêm câu)
  - Tab 2: "Settings" (pool metadata, share)
- Hoặc **Collapsible sections** để user có thể ẩn/hiện form

---

## 3️⃣ UI – Visual & Micro-interaction

### 3.1 Typography & Spacing

**Hiện tại:**
- `p-4` cho cards → hơi chật
- Heading `text-lg` → có thể lớn hơn
- Thiếu spacing giữa các sections

**Đề xuất:**
- Tăng padding: `p-5 md:p-6`
- Heading: `text-xl` hoặc `text-2xl` cho pool name
- Spacing: `space-y-6` hoặc `space-y-7`

---

### 3.2 Question display

**Hiện tại:**
```tsx
<div className="rounded-md border border-border-subtle bg-bg-section p-3">
  <div>{q.type} · {q.id}</div>
  <div>{q.prompt}</div>
  <div>{q.options.map(...)}</div>
  <div>{q.tags.map(...)}</div>
</div>
```

**Vấn đề:**
- Hiển thị `id` (UUID) → không cần thiết cho user
- Options không có visual hierarchy rõ ràng
- Correct answer không nổi bật đủ

**Đề xuất:**
- Bỏ `id` hoặc chỉ hiển thị khi hover
- Highlight correct answer rõ hơn (badge, background color)
- Thêm số thứ tự câu hỏi (#1, #2, ...)
- Thêm hover effect và click để edit

---

### 3.3 Form styling

**Hiện tại:**
- Input fields dùng class trực tiếp → không consistent với design system
- Thiếu Input component từ UI library
- Thiếu Label component

**Đề xuất:**
- Dùng `Input` component từ `@/components/ui/Input`
- Dùng `Label` component
- Consistent với các form khác trong app

---

## 4️⃣ So với Design Spec (`docs/uiux/question-bank.md`)

| Yêu cầu từ spec | Hiện tại | Status |
|----------------|----------|--------|
| Pool name (editable) | ❌ Chưa có | **Missing** |
| Visibility + permission | ⚠️ Có nhưng chưa đầy đủ | **Needs improvement** |
| Stats (số câu, số tags) | ❌ Chưa có | **Missing** |
| Last updated | ❌ Chưa có | **Missing** |
| Edit metadata actions | ❌ Chưa có | **Missing** |
| Tabs (Questions / Settings) | ❌ Chưa có | **Missing** |
| Questions table với columns | ⚠️ Có list nhưng không phải table | **Needs improvement** |
| Edit/Delete question | ❌ Chưa có | **Missing** |
| Import từ Markdown | ❌ Chưa có | **Missing** |
| Tag multi-select | ⚠️ Có nhưng chỉ text input | **Needs improvement** |

---

## 5️⃣ Checklist cải thiện (Priority)

### 🔥 High Priority (Làm ngay)

- [ ] **Thêm breadcrumb navigation**
- [ ] **Cải thiện header pool** với stats, permission, actions
- [ ] **Thêm edit/delete câu hỏi** functionality
- [ ] **Cải thiện form thêm câu hỏi:**
  - Dynamic options list
  - Multi-correct support cho mcq_multi
  - Better validation
- [ ] **Thêm search/filter** cho questions list
- [ ] **Thêm unshare** functionality
- [ ] **Thêm edit pool metadata** (tên, visibility)

### 🚀 Medium Priority (Làm tiếp)

- [ ] **Tabs layout** (Questions / Settings)
- [ ] **Collapsible form** để không chiếm quá nhiều không gian
- [ ] **Tag suggestions** (click để chọn thay vì gõ)
- [ ] **Preview câu hỏi** trước khi lưu
- [ ] **Better question display** với hover effects, edit button
- [ ] **Pagination** cho questions list (nếu > 50 câu)
- [ ] **Import từ Markdown** trong pool detail page

### 💡 Low Priority (Nice to have)

- [ ] **Bulk actions** (delete multiple questions)
- [ ] **Drag & drop reorder** options
- [ ] **Markdown preview** cho prompt
- [ ] **LaTeX rendering** cho prompt
- [ ] **Import history** section
- [ ] **Export pool** to Markdown

---

## 6️⃣ So với best practices (Linear / Notion / Canvas LMS)

| Tiêu chí | Hiện tại | Chuẩn 2026 |
|----------|----------|------------|
| **Clarity** | 5 | 9 |
| **Actionability** | 4 | 9 |
| **Information density** | 6 | 8 |
| **Edit capabilities** | 3 | 9 |
| **Navigation** | 4 | 9 |

👉 **Kết luận:** Đang ở **40-50% level** của các sản phẩm chuyên nghiệp. Cần cải thiện đáng kể về:
- Edit/Delete capabilities
- Information hierarchy
- Navigation và breadcrumbs
- Form UX

---

## 7️⃣ Đề xuất cụ thể

### 7.1 Layout mới đề xuất

```
┌─────────────────────────────────────────┐
│ ← Dashboard · Question Bank · Pool Name│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Pool Name                    [Edit Pool]│
│ private · owner · 50 câu · 10 tags     │
│ Cập nhật: 2 ngày trước                  │
└─────────────────────────────────────────┘

┌───────────────┬─────────────────────────┐
│ [Questions]   │ [Settings]             │
├───────────────┴─────────────────────────┤
│                                           │
│ [Search] [Filter] [Thêm câu hỏi]        │
│                                           │
│ ┌─────────────────────────────────────┐ │
│ │ #1  mcq_single                      │ │
│ │ Prompt text...                      │ │
│ │ ✓ Option 1 (correct)               │ │
│ │   Option 2                         │ │
│ │ Tags: [tag1] [tag2]                │ │
│ │ [Edit] [Delete]                    │ │
│ └─────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

### 7.2 Form thêm câu hỏi cải thiện

```tsx
<Card>
  <div className="flex items-center justify-between mb-4">
    <h3>Thêm câu hỏi mới</h3>
    <Button variant="ghost" size="sm" onClick={toggleCollapse}>
      {expanded ? 'Thu gọn' : 'Mở rộng'}
    </Button>
  </div>
  
  {expanded && (
    <div className="space-y-4">
      {/* Type, Prompt, Tags */}
      
      {/* Dynamic Options */}
      <div>
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-2">
            <Input value={opt} onChange={...} />
            {type === 'mcq_multi' && (
              <Checkbox checked={opt.isCorrect} />
            )}
            <Button size="sm" variant="ghost" onClick={removeOption}>
              Xóa
            </Button>
          </div>
        ))}
        <Button variant="ghost" onClick={addOption}>
          + Thêm option
        </Button>
      </div>
      
      {/* Preview */}
      <Card className="bg-bg-section">
        <div className="text-sm font-medium mb-2">Preview</div>
        {/* Render question preview */}
      </Card>
      
      <Button variant="primary" onClick={saveQuestion}>
        Lưu câu hỏi
      </Button>
    </div>
  )}
</Card>
```

---

## 8️⃣ Kết luận

**Question Pool Detail page hiện tại:**
- ✅ **Có chức năng cơ bản** (xem, thêm câu, share)
- ❌ **Thiếu nhiều tính năng quan trọng** (edit, delete, search)
- ❌ **UX chưa professional** (form quá đơn giản, thiếu navigation)
- ❌ **UI chưa consistent** với design system

**Ưu tiên cải thiện:**
1. Thêm breadcrumb và cải thiện header
2. Thêm edit/delete câu hỏi
3. Cải thiện form thêm câu hỏi (dynamic options, multi-correct)
4. Thêm search/filter
5. Thêm edit pool metadata

Sau khi cải thiện, page này sẽ đạt **8.0/10** về UX.

