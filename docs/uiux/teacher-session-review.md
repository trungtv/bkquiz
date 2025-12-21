# Teacher Session Screen UI/UX Review

## 🔍 Phân tích hiện tại

### URL: `/dashboard/sessions/[sessionId]/teacher`

---

## 📊 Current Implementation

### Layout Structure
- ✅ Card-based layout với max-width container
- ✅ 2-column grid cho QR và Token
- ✅ Token log và Scoreboard tables
- ⚠️ **Vấn đề**: Không phải full-screen, không tối ưu cho máy chiếu

### QR Code Section
- ✅ QR code hiển thị đúng
- ✅ URL join hiển thị dưới QR
- ⚠️ **Vấn đề**: 
  - QR code quá nhỏ (360px) - khó scan từ xa
  - URL không rút gọn khi dài
  - Thiếu gợi ý rõ ràng cho sinh viên

### Token Section
- ✅ Token hiển thị lớn (text-7xl)
- ✅ Countdown timer hoạt động
- ✅ Auto-refresh khi token hết hạn
- ⚠️ **Vấn đề**:
  - Token có thể lớn hơn (≥48px như docs yêu cầu)
  - Thiếu progress bar cho countdown
  - Màu token chưa nổi bật (màu trắng/xám)

### Session Info
- ✅ Session ID hiển thị
- ✅ Status badge
- ✅ Quiz title
- ⚠️ **Vấn đề**:
  - Thiếu tên lớp (classroom name)
  - Thiếu thời gian bắt đầu (startedAt)
  - Thiếu thời gian đã chạy (duration)
  - Session ID quá dài, không cần thiết hiển thị đầy đủ

### Controls
- ✅ Start button khi session ở lobby
- ✅ End button khi session active
- ✅ Refresh token button
- ⚠️ **Vấn đề**:
  - Buttons có thể lớn hơn, dễ bấm hơn khi trình chiếu
  - Thiếu confirmation dialog cho End button
  - Thiếu visual feedback khi đang xử lý

### Snapshot Info
- ✅ Hiển thị summary khi start session
- ✅ Hiển thị per-rule stats
- ⚠️ **Vấn đề**:
  - Chỉ hiển thị khi có snapshot, không hiển thị khi đã build trước đó
  - Format text khó đọc (requested/picked)

### Token Log
- ✅ Table hiển thị logs
- ✅ Download CSV link
- ✅ Refresh button
- ⚠️ **Vấn đề**:
  - Table có thể sortable
  - Thiếu filter (by type, by user)
  - Time format có thể rõ ràng hơn (include date)

### Scoreboard
- ✅ Table hiển thị scores
- ✅ Download CSV link
- ✅ Refresh button
- ⚠️ **Vấn đề**:
  - Table có thể sortable (by score, by submitted time)
  - Thiếu filter (by status)
  - Score format có thể rõ ràng hơn (percentage)

---

## ❌ Vấn đề chính

### 1. **Layout & Visual Design** - Critical
- ❌ Không phải full-screen layout
- ❌ Nền không đen (không tối ưu cho máy chiếu)
- ❌ QR code quá nhỏ (360px) - khó scan từ xa
- ❌ Token chưa đủ nổi bật (màu, size)
- ❌ Thiếu progress bar cho countdown

### 2. **Information Hierarchy** - High
- ⚠️ Session info thiếu tên lớp
- ⚠️ Session info thiếu thời gian bắt đầu/duration
- ⚠️ Session ID quá dài, không cần thiết
- ⚠️ Snapshot info format khó đọc

### 3. **User Experience** - Medium
- ⚠️ Buttons có thể lớn hơn, dễ bấm hơn
- ⚠️ Thiếu confirmation dialog cho End button
- ⚠️ Thiếu visual feedback khi đang xử lý
- ⚠️ Tables thiếu sorting/filtering

### 4. **Spacing & Layout** - Low
- ⚠️ Spacing có thể consistent hơn
- ⚠️ Cards có thể có better visual hierarchy

---

## 🎯 Đề xuất cải thiện

### Priority 1: Full-Screen Layout & Visual Design (Critical)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Full-screen, nền đen (#000 hoặc charcoal-900)           │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ QR Code (50% width)  │  │ Token (50% width)     │   │
│  │ - QR lớn (480px+)    │  │ - Token rất lớn       │   │
│  │ - URL rút gọn        │  │ - Progress bar        │   │
│  │ - Gợi ý rõ ràng      │  │ - Countdown lớn        │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Session Info Bar (sticky top)                    │  │
│  │ - Quiz title, Class name, Status, Duration       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ Token Log            │  │ Scoreboard           │   │
│  │ - Sortable table     │  │ - Sortable table     │   │
│  │ - Filters            │  │ - Filters            │   │
│  └──────────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Visual Design
- **Background**: Nền đen (#000) hoặc charcoal-900
- **Text**: Màu trắng/sáng cho contrast tốt
- **Token**: 
  - Size: text-8xl hoặc text-9xl (≥72px)
  - Color: Màu cam (primary) hoặc đỏ nổi bật
  - Font: Monospace, tracking rộng
- **QR Code**: 
  - Size: 480px+ (lớn hơn hiện tại)
  - Background: Trắng với padding
  - Border: Dày, nổi bật

### Priority 2: Information Hierarchy (High)

#### Session Info Bar
```
┌─────────────────────────────────────────────────────────┐
│ [Quiz Title] · [Class Name] · [Status Badge] · [Duration] │
│ Started: [time] · [X] students joined                    │
└─────────────────────────────────────────────────────────┘
```

#### Snapshot Info
- Format rõ ràng hơn:
  ```
  ✅ Đủ câu theo tất cả rules (Total: 50 câu)
  
  Hoặc:
  ⚠️ Thiếu câu:
  - Tag "toan": Cần 10, có 8 (thiếu 2)
  - Tag "ly": Cần 5, có 5 (đủ)
  ```

### Priority 3: User Experience (Medium)

#### Controls
- **Start/End buttons**: 
  - Size lớn hơn (lg hoặc xl)
  - Confirmation dialog cho End button
  - Loading state khi đang xử lý
- **Refresh token button**: 
  - Icon + text
  - Visual feedback khi refresh

#### Tables
- **Sortable columns**: Click header để sort
- **Filters**: 
  - Token log: Filter by type, by user
  - Scoreboard: Filter by status, by score range
- **Pagination**: Nếu có nhiều rows (>50)

### Priority 4: Spacing & Layout (Low)

#### Spacing
- Consistent spacing với design tokens
- Cards có padding lớn hơn (p-6 → p-8)
- Gap giữa sections lớn hơn (gap-6 → gap-8)

#### Visual Hierarchy
- Cards có shadow lớn hơn
- Borders có thể rõ ràng hơn
- Hover effects cho interactive elements

---

## 📝 Checklist Implementation

### Phase 1: Critical (Must Have)
- [ ] Full-screen layout với nền đen
- [ ] QR code lớn hơn (480px+)
- [ ] Token lớn hơn và nổi bật hơn (text-8xl, màu cam)
- [ ] Progress bar cho countdown
- [ ] Session info bar với đầy đủ thông tin

### Phase 2: High Priority
- [ ] Snapshot info format rõ ràng hơn
- [ ] URL rút gọn khi dài
- [ ] Gợi ý rõ ràng cho sinh viên

### Phase 3: Medium Priority
- [ ] Sortable tables
- [ ] Filters cho tables
- [ ] Confirmation dialog cho End button
- [ ] Loading states cho buttons

### Phase 4: Low Priority
- [ ] Better spacing và visual hierarchy
- [ ] Hover effects
- [ ] Animations

---

## 🎨 Design Tokens cần dùng

- Background: `bg-charcoal-900` hoặc `bg-black`
- Text: `text-white` hoặc `text-charcoal-100`
- Token: `text-primary` (cam) hoặc `text-red-500`
- QR: `bg-white` với `p-4` hoặc `p-6`
- Cards: `bg-charcoal-800` với `border-charcoal-700`

---

## 📚 References

- `docs/uiux/session-teacher.md` - Spec gốc
- `docs/uiux/guidelines.md` - Design guidelines
- Current implementation: `src/app/[locale]/(auth)/dashboard/sessions/[sessionId]/teacher/teacherScreen.tsx`

