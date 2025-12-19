# 📊 Đánh giá UI/UX Trang Quiz Detail

**URL mẫu**: `/dashboard/quizzes/[quizId]`  
**Ngày đánh giá**: 2025-12-19  
**Tiêu chuẩn**: SaaS/EdTech 2025-2026, Framer-style, BKquiz Design System

---

## 1️⃣ Tổng quan (Executive Summary)

### ✅ Điểm mạnh
- **Visual Design**: 8.5/10 – Dark theme nhất quán, spacing đã chuẩn
- **Component Consistency**: 9/10 – Card, Button, Input đều nhất quán
- **Functionality**: 8/10 – Tag suggestions, rule deletion, preview đã có

### ⚠️ Điểm yếu
- **Information Architecture**: 6/10 – Thiếu context, flow chưa tối ưu
- **Navigation**: 5/10 – Không có breadcrumb, khó quay lại
- **User Guidance**: 6.5/10 – Empty states và feedback chưa đầy đủ

**Tổng điểm hiện tại**: **7.2/10**  
**Mức độ**: "Đủ dùng MVP" nhưng chưa "production-ready"

---

## 2️⃣ Vấn đề chi tiết & Đề xuất

### 🔴 Critical Issues (Làm ngay)

#### 2.1. Thiếu thông tin quiz context

**Hiện tại**:
```
Card 1: "Quiz Rules (same-set)"
  - Quiz: cmjbjsw6a01oz8oohiewy440m (chỉ có ID)
```

**Vấn đề**:
- User không biết quiz này tên gì
- Không biết thuộc lớp nào
- Không biết status (draft/published)
- Không có cách quay lại

**Đề xuất**:
```tsx
<Card className="p-5 md:p-6">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-text-heading truncate">
          {quiz.title}
        </h1>
        <Badge variant={quiz.status === 'published' ? 'success' : 'neutral'}>
          {quiz.status}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>
          Lớp:
          {' '}
          <Link href={`/dashboard/classes`} className="text-primary hover:underline">
            {quiz.classroom.name}
          </Link>
        </span>
        <span>·</span>
        <span>
          Cập nhật:
          {' '}
          {formatDate(quiz.updatedAt)}
        </span>
        <span>·</span>
        <span className="font-mono text-xs">
          ID: {quiz.id.slice(0, 8)}...
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Link href="/dashboard/quizzes">
        <Button variant="ghost" size="sm">
          ← Quay lại
        </Button>
      </Link>
      {quiz.status === 'draft' && (
        <Button
          variant="primary"
          size="sm"
          onClick={handlePublish}
          disabled={rules.length === 0}
        >
          Publish Quiz
        </Button>
      )}
    </div>
  </div>
</Card>
```

**API cần thêm**:
```typescript
// GET /api/quizzes/[quizId]
{
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  classroom: { id: string; name: string; classCode: string };
}
```

---

#### 2.2. Flow thông tin chưa tối ưu

**Hiện tại**:
1. Header (chỉ có ID)
2. Preview card
3. Rule Builder (form dài)
4. Rules List

**Vấn đề**:
- User phải scroll xuống mới thấy rules hiện có
- Preview ở trên nhưng chưa có rules thì preview không có ý nghĩa
- Rule Builder quá dài, dễ overwhelm

**Đề xuất flow mới**:
1. **Header** (quiz info + actions)
2. **Rules List** (xem trước các rules đã có)
3. **Rule Builder** (thêm rule mới, có thể collapse/expand)
4. **Preview** (sau khi có rules)

**Lý do**:
- User thấy ngay "đã có gì" trước khi "thêm mới"
- Preview có context từ rules list
- Rule Builder có thể collapse khi không dùng

---

#### 2.3. Thiếu breadcrumb/navigation

**Hiện tại**: Không có cách quay lại danh sách quiz

**Đề xuất**:
```tsx
<nav className="mb-4 text-sm">
  <div className="flex items-center gap-2 text-text-muted">
    <Link href="/dashboard" className="hover:text-text-heading">
      Dashboard
    </Link>
    <span>·</span>
    <Link href="/dashboard/quizzes" className="hover:text-text-heading">
      Quizzes
    </Link>
    <span>·</span>
    <span className="text-text-heading truncate">{quiz.title}</span>
  </div>
</nav>
```

---

### 🟡 Medium Priority (Làm tiếp)

#### 2.4. Rule Builder quá dài

**Hiện tại**: Tất cả fields trong 1 card dài

**Đề xuất**: Chia thành sections với collapse/expand
```tsx
<Card className="p-5 md:p-6">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold text-text-heading">
      Thêm lượt chọn câu mới
    </h2>
    <Button
      variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
    >
      {expanded ? 'Thu gọn' : 'Mở rộng'}
    </Button>
  </div>
  {expanded && (
    <div className="mt-4 space-y-4">
      {/* Sections */}
    </div>
  )}
</Card>
```

---

#### 2.5. Thiếu feedback sau actions

**Hiện tại**: Save rule xong không có toast/notification

**Đề xuất**: Thêm toast notification
```tsx
// Sau khi saveRule() thành công
toast.success('Đã lưu lượt chọn câu thành công');
```

---

#### 2.6. Empty states chưa đầy đủ

**Hiện tại**: "Chưa có rule nào."

**Đề xuất**:
```tsx
{rules.length === 0 ? (
  <div className="py-8 text-center">
    <div className="text-sm text-text-muted">
      Chưa có lượt chọn câu nào.
    </div>
    <div className="mt-2 text-xs text-text-muted">
      Bấm "Mở rộng" ở khung "Thêm lượt chọn câu mới" bên dưới để bắt đầu.
    </div>
  </div>
) : (
  // Rules list
)}
```

---

### 🟢 Nice to Have (Phase sau)

#### 2.7. Quick stats card
- Tổng số câu dự kiến
- Số rules
- Status badge
- Link đến sessions đã dùng quiz này

#### 2.8. Edit rule (hiện chỉ có delete)
- Click vào rule → mở modal/edit inline

#### 2.9. Drag & drop để sắp xếp rules
- Thứ tự rules có thể quan trọng

---

## 3️⃣ So sánh với chuẩn

| Tiêu chí | Hiện tại | Chuẩn 2026 | Gap |
|----------|----------|------------|-----|
| **Information Hierarchy** | 6 | 9 | -3 |
| **Navigation** | 5 | 9 | -4 |
| **Feedback & Guidance** | 6.5 | 9 | -2.5 |
| **Visual Design** | 8.5 | 9 | -0.5 |
| **Functionality** | 8 | 9 | -1 |

**Tổng**: 7.2/10 vs 9/10 chuẩn

---

## 4️⃣ Checklist cải thiện

### 🔥 Critical (1-2 ngày)
- [ ] Thêm API `/api/quizzes/[quizId]` trả về title, status, classroom
- [ ] Hiển thị quiz title, status, classroom trong header card
- [ ] Thêm breadcrumb/navigation
- [ ] Đổi thứ tự: Rules List → Rule Builder → Preview
- [ ] Thêm nút "Quay lại" và "Publish Quiz" (nếu draft)

### 🚀 Medium (1 tuần)
- [ ] Thêm toast notifications sau save/delete
- [ ] Cải thiện empty states với hướng dẫn
- [ ] Collapse/expand cho Rule Builder
- [ ] Loading states rõ ràng hơn

### 💡 Nice to Have (Phase sau)
- [ ] Quick stats card
- [ ] Edit rule functionality
- [ ] Drag & drop sắp xếp rules
- [ ] Link đến sessions đã dùng quiz

---

## 5️⃣ Kết luận

**Trang hiện tại**: Đủ dùng cho MVP, nhưng thiếu context và navigation.

**Sau khi fix Critical issues**: Sẽ đạt **8.5/10**, đủ production-ready.

**Ưu tiên**: Làm Critical issues trước, đặc biệt là thêm quiz context và navigation.

