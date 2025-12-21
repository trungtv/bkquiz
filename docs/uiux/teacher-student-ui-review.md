# Teacher vs Student UI Review

## 🔍 Vấn đề hiện tại

Giao diện cho **teacher** và **student** đang **không có sự khác biệt rõ ràng**, dẫn đến:
- Student có thể thấy các link/features không phù hợp
- UX confusing vì student không biết mình có thể làm gì
- Thiếu visual distinction giữa 2 personas

---

## 📊 Phân tích chi tiết

### 1. **Sidebar Navigation** ❌

**Hiện tại:**
- Sidebar hiển thị **TẤT CẢ** links cho cả teacher và student:
  - Dashboard
  - Classes
  - Quizzes
  - Question Bank
  - User Profile

**Vấn đề:**
- Student không nên thấy "Quizzes" và "Question Bank" (chỉ teacher mới tạo được)
- Student cần link riêng: "My Sessions" hoặc "Active Sessions"

**Đề xuất:**
```tsx
// Sidebar.tsx - Conditional rendering based on role
{role === 'teacher' ? (
  <>
    <Link href="/dashboard/quizzes/">Quizzes</Link>
    <Link href="/dashboard/question-bank/">Question Bank</Link>
  </>
) : (
  <Link href="/dashboard/sessions/">My Sessions</Link>
)}
```

---

### 2. **Dashboard Page** ⚠️

**Hiện tại:**
- Có phân biệt một phần:
  - Description khác nhau
  - Quick actions buttons khác nhau
  - "Getting started" chỉ hiển thị cho teacher

**Vấn đề:**
- **KPI Cards** vẫn hiển thị cho student:
  - "Quizzes" card → Student không tạo quiz, nên hiển thị `0` là vô nghĩa
  - "Active sessions" card → Nên hiển thị sessions mà student đang tham gia, không phải sessions của teacher
- **Quick Access sidebar** hiển thị "Question pools" cho student → không phù hợp

**Đề xuất:**

#### 2.1. KPI Cards cho Student
```tsx
// Student-specific KPIs:
- "My Active Sessions" - số session student đang làm
- "My Classes" - số lớp đang tham gia
- "My Attempts" - số bài đã làm (hoặc "Completed Sessions")
```

#### 2.2. Quick Access cho Student
```tsx
// Student-specific quick access:
- "Active Sessions" - sessions đang chạy mà student có thể join
- "My Classes" - classes student đang tham gia
- "Recent Attempts" - các bài đã làm gần đây
```

---

### 3. **Classes Page** ⚠️

**Hiện tại:**
- Cả teacher và student đều có thể truy cập
- Student có thể xem class detail nhưng không thể tạo session

**Vấn đề:**
- UI không phân biệt rõ: student thấy các actions không phù hợp (nếu có)
- Student không cần thấy "Create Session" button

**Đề xuất:**
- Class detail page: ẩn "Create Session" cho student
- Hiển thị "Join Session" hoặc "View Sessions" thay vì

---

### 4. **Quizzes Page** ❌

**Hiện tại:**
- Không có protection → student có thể truy cập `/dashboard/quizzes/`
- Student sẽ thấy empty state hoặc lỗi

**Vấn đề:**
- Student không nên thấy trang này
- Nên redirect hoặc hiển thị "Access Denied"

**Đề xuất:**
```tsx
// quizzes/page.tsx
export default async function QuizzesPage() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole);
  
  if (role !== 'teacher') {
    redirect('/dashboard');
  }
  // ... rest of teacher-only content
}
```

---

### 5. **Question Bank Page** ❌

**Hiện tại:**
- Tương tự Quizzes page → student có thể truy cập

**Vấn đề:**
- Student không nên thấy trang này

**Đề xuất:**
- Thêm role check và redirect nếu không phải teacher

---

### 6. **Sessions Page** ⚠️

**Hiện tại:**
- Có route `/dashboard/sessions` nhưng chưa rõ implementation
- Student cần trang này để xem sessions của mình

**Vấn đề:**
- Cần đảm bảo student thấy được:
  - Active sessions mà student có thể join
  - Past sessions mà student đã tham gia
  - Upcoming sessions (nếu có)

**Đề xuất:**
- Tạo `/dashboard/sessions` page riêng cho student
- Teacher có thể dùng route khác hoặc cùng route nhưng filter khác

---

## 🎯 Đề xuất cải thiện

### Priority 1: High (Làm ngay)

1. **Sidebar - Conditional Navigation**
   - Ẩn "Quizzes" và "Question Bank" cho student
   - Thêm "My Sessions" cho student
   - Hiển thị role badge (optional)

2. **Dashboard - Student-specific KPIs**
   - Thay "Quizzes" card bằng "My Active Sessions"
   - Thay "Active sessions" (teacher's) bằng "My Sessions" (student's)
   - Update Quick Access sidebar

3. **Route Protection**
   - Thêm role check cho `/dashboard/quizzes/`
   - Thêm role check cho `/dashboard/question-bank/`
   - Redirect hoặc hiển thị "Access Denied"

### Priority 2: Medium (Làm sau)

4. **Visual Distinction**
   - Thêm role badge trong header/sidebar
   - Color coding nhẹ (ví dụ: teacher = orange accent, student = blue accent)
   - Different empty states

5. **Student Sessions Page**
   - Tạo `/dashboard/sessions` page cho student
   - Hiển thị active/past sessions
   - Quick join actions

6. **Class Detail - Role-based Actions**
   - Ẩn "Create Session" cho student
   - Hiển thị "View Sessions" cho student

### Priority 3: Low (Nice to have)

7. **Onboarding Flow**
   - Different "Getting started" cho student
   - Tutorial/guide cho student

8. **Analytics/Stats**
   - Student: "My Performance", "My Scores"
   - Teacher: "Class Performance", "Quiz Analytics"

---

## 📝 Implementation Checklist

### Sidebar
- [ ] Pass `role` prop to Sidebar component
- [ ] Conditional rendering for "Quizzes" link (teacher only)
- [ ] Conditional rendering for "Question Bank" link (teacher only)
- [ ] Add "My Sessions" link for student
- [ ] Optional: Add role badge

### Dashboard Page
- [ ] Update KPI cards for student:
  - [ ] Replace "Quizzes" with "My Active Sessions"
  - [ ] Update "Active sessions" to show student's sessions
- [ ] Update Quick Access sidebar for student
- [ ] Add student-specific "Getting started" (optional)

### Route Protection
- [ ] Add role check in `/dashboard/quizzes/page.tsx`
- [ ] Add role check in `/dashboard/question-bank/page.tsx`
- [ ] Add role check in `/dashboard/quizzes/[quizId]/page.tsx`
- [ ] Add role check in `/dashboard/question-bank/[poolId]/page.tsx`

### Student Sessions Page
- [ ] Create `/dashboard/sessions/page.tsx`
- [ ] Fetch student's active/past sessions
- [ ] Display sessions list with join/view actions
- [ ] Add empty state

### Class Detail
- [ ] Hide "Create Session" button for student
- [ ] Show "View Sessions" link for student
- [ ] Update class detail panel based on role

---

## 🎨 Visual Mockup Ideas

### Sidebar với Role Badge
```
┌─────────────────────┐
│ BKquiz              │
│ Dashboard           │
│ [Teacher] ← badge   │
├─────────────────────┤
│ 📊 Dashboard        │
│ 👥 Classes          │
│ 📝 Quizzes          │ ← chỉ teacher
│ 📚 Question Bank    │ ← chỉ teacher
│ 🎯 My Sessions      │ ← chỉ student
│ 👤 Profile          │
└─────────────────────┘
```

### Dashboard Student View
```
┌─────────────────────────────────┐
│ Tổng quan                        │
│ Xem các lớp bạn tham gia...      │
│ [Xem các session của bạn]        │
├─────────────────────────────────┤
│ Classes    My Sessions  Attempts │
│    3           2           5     │
└─────────────────────────────────┘
```

---

## ✅ Kết luận

**Hiện tại: 4/10** - Thiếu sự phân biệt rõ ràng

**Sau khi implement: 8/10** - Clear distinction, better UX

**Cần làm ngay:**
1. Sidebar conditional navigation
2. Dashboard student-specific KPIs
3. Route protection cho teacher-only pages

**Timeline ước tính:**
- Priority 1: 2-3 giờ
- Priority 2: 3-4 giờ
- Priority 3: 4-6 giờ

