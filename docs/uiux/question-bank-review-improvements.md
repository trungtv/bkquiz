# 📊 Đánh giá & Cải thiện Trang Question Bank

**URL**: `http://localhost:3000/dashboard/question-bank`  
**Ngày đánh giá**: 2025-12-21  
**Tham khảo**: `/dashboard/classes` (best practice)

---

## 1️⃣ So sánh với Classes Panel

### ✅ Điểm mạnh của Question Bank hiện tại
- ✅ Có tag filter
- ✅ Có empty state với CTA buttons
- ✅ Có skeleton loading
- ✅ Layout responsive

### ⚠️ Điểm cần cải thiện (học từ Classes Panel)

#### 1.1. Layout Structure
**Classes Panel**:
- Grid layout: `grid-cols-[2fr_auto_120px_100px]`
- Tags ở cột riêng (tách biệt với metadata)
- Information hierarchy rõ ràng

**Question Bank hiện tại**:
- Layout đơn giản, không có grid
- Tags nằm dưới metadata (không tách biệt)
- Metadata inline với dots (·)

**Đề xuất**: Áp dụng grid layout tương tự Classes Panel

---

#### 1.2. Hover Effects & Interactions
**Classes Panel**:
```tsx
hover:translate-x-1 hover:shadow-md hover:border-primary/30
transition-all duration-200
```

**Question Bank hiện tại**:
- Chỉ có Card `interactive` prop
- Không có hover effects rõ ràng

**Đề xuất**: Thêm hover effects giống Classes Panel

---

#### 1.3. Animations
**Classes Panel**:
```tsx
animate-slideUp (Card container)
animationDelay: `${idx * 30}ms` (mỗi item)
```

**Question Bank hiện tại**:
- Không có animations

**Đề xuất**: Thêm animations cho consistency

---

#### 1.4. Visual Indicators
**Classes Panel**:
- Arrow indicator (→) ở cuối mỗi item
- Border color dựa trên role/status

**Question Bank hiện tại**:
- Button "Mở" thay vì arrow
- Không có border color differentiation

**Đề xuất**: 
- Thay button "Mở" bằng arrow indicator (→)
- Thêm border color dựa trên visibility (private/shared)

---

#### 1.5. Spacing & Consistency
**Classes Panel**:
- `space-y-7` cho container
- `p-5 md:p-6` cho cards
- Consistent spacing

**Question Bank hiện tại**:
- `space-y-6` (nên là `space-y-7`)
- `p-5 md:p-6` ✅ (đúng)

**Đề xuất**: Chuẩn hóa spacing

---

## 2️⃣ Cải thiện cụ thể

### 2.1. Redesign List Items Layout

**Hiện tại**:
```tsx
<Card interactive>
  <div className="flex items-center justify-between">
    <div className="min-w-0 flex-1">
      <div>{p.name}</div>
      <div className="mt-1.5 flex items-center gap-3">
        <span>{p.questionCount} câu</span>
        <span>·</span>
        <span>{p.tagCount} tags</span>
        <span>·</span>
        <Badge>{p.visibility}</Badge>
        <span>·</span>
        <span>{date}</span>
      </div>
      {p.tags && (
        <div className="mt-2 flex flex-wrap gap-1">
          {/* tags */}
        </div>
      )}
    </div>
    <Button>Mở</Button>
  </div>
</Card>
```

**Đề xuất** (giống Classes Panel):
```tsx
<Link href={`/dashboard/question-bank/${p.id}`}>
  <div className="rounded-md border bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30">
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text-heading">{p.name}</div>
          <div className="mt-1 text-xs text-text-muted">
            {p.questionCount ?? 0} câu
          </div>
        </div>
        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {p.tags.slice(0, 5).map(tag => (
              <Badge key={tag.id} variant="neutral" className="text-xs">
                {tag.name}
              </Badge>
            ))}
            {p.tags.length > 5 && (
              <Badge variant="neutral" className="text-xs">
                +{p.tags.length - 5}
              </Badge>
            )}
          </div>
        )}
        <Badge variant={p.visibility === 'shared' ? 'info' : 'neutral'} className="text-xs">
          {p.visibility}
        </Badge>
        <div className="text-xs text-text-muted">
          <span className="font-mono">
            {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">→</span>
      </div>
    </div>
  </div>
</Link>
```

---

### 2.2. Thêm Animations

```tsx
<Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
  {/* ... */}
  {sorted.map((p, idx) => (
    <Link key={p.id} href={...}>
      <div
        className="..."
        style={{ animationDelay: `${idx * 30}ms` }}
      >
```

---

### 2.3. Cải thiện Border Colors

```tsx
className={`rounded-md border bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
  p.visibility === 'shared'
    ? 'border-primary/30 hover:border-primary/50'
    : 'border-border-subtle hover:border-border-strong'
}`}
```

---

### 2.4. Chuẩn hóa Spacing

```tsx
// Container
<div className="space-y-7">  // Thay vì space-y-6

// Card padding (đã đúng)
<Card className="p-5 md:p-6">
```

---

## 3️⃣ Checklist Cải thiện

### 🔥 Critical (High Priority)
- [ ] Redesign list items với grid layout (giống Classes Panel)
- [ ] Di chuyển tags ra cột riêng
- [ ] Thêm hover effects (translate-x-1, shadow-md, border color)
- [ ] Thay button "Mở" bằng arrow indicator (→)
- [ ] Thêm animations (slideUp + delay)

### 🟡 Medium Priority
- [ ] Chuẩn hóa spacing (`space-y-7`)
- [ ] Thêm border color dựa trên visibility
- [ ] Cải thiện metadata display (có thể giữ inline hoặc tách ra)

### 🟢 Low Priority
- [ ] Có thể thêm stats cards (tổng pools, shared, private)
- [ ] Cải thiện empty state (đã tốt, có thể thêm icon)

---

## 4️⃣ Code Changes Cần Thiết

### 4.1. Update Container Spacing
```tsx
// Before
<div className="space-y-6">

// After
<div className="space-y-7">
```

### 4.2. Update List Card
```tsx
// Before
<Card className="p-5 md:p-6">

// After
<Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
```

### 4.3. Redesign List Items
- Wrap trong Link (thay vì Card interactive)
- Dùng grid layout
- Thêm hover effects
- Thêm animations
- Thay button bằng arrow

---

## 5️⃣ Kết luận

**Mục tiêu**: Làm cho Question Bank Panel nhất quán với Classes Panel về:
- Layout structure
- Interactive states
- Visual consistency
- User experience

**Sau khi cải thiện**: Question Bank sẽ có:
- ✅ Layout nhất quán với Classes Panel
- ✅ Better visual hierarchy
- ✅ Improved interactions
- ✅ Consistent animations
- ✅ Better UX overall

**Priority**: High - Nên làm ngay để đảm bảo consistency trong toàn bộ dashboard.
