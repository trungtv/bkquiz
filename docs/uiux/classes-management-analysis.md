# 📚 Phân tích: Trang Quản lý Lớp (Classes Management)

## 1️⃣ Hiện trạng

### ✅ Đã có
- **ClassroomPanel component** nhúng trong `/dashboard` page
  - Tạo lớp mới
  - Join lớp bằng code
  - Hiển thị danh sách lớp (expandable)
  - Tạo session từ lớp (chọn quiz → tạo session)

- **API endpoints:**
  - `POST /api/classes` - Tạo lớp
  - `POST /api/classes/join` - Join lớp

- **Link trong dashboard:**
  - Link `/dashboard/classes` trong KPI card nhưng **KHÔNG CÓ ROUTE**

### ❌ Thiếu

#### 1. Trang riêng `/dashboard/classes`
- Hiện tại chỉ có `ClassroomPanel` nhúng trong dashboard
- Không có trang riêng để quản lý lớp một cách tập trung
- So sánh với:
  - ✅ `/dashboard/quizzes` - có trang riêng
  - ✅ `/dashboard/question-bank` - có trang riêng
  - ❌ `/dashboard/classes` - **CHƯA CÓ**

#### 2. Trang chi tiết lớp `/dashboard/classes/[classId]`
- Không có trang để xem chi tiết một lớp cụ thể
- So sánh với:
  - ✅ `/dashboard/quizzes/[quizId]` - có trang detail
  - ✅ `/dashboard/question-bank/[poolId]` - có trang detail
  - ❌ `/dashboard/classes/[classId]` - **CHƯA CÓ**

#### 3. API endpoints thiếu
- `GET /api/classes` - Lấy danh sách lớp (có filter, pagination)
- `GET /api/classes/[classId]` - Lấy chi tiết lớp
- `GET /api/classes/[classId]/members` - Lấy danh sách members
- `GET /api/classes/[classId]/sessions` - Lấy danh sách sessions của lớp
- `GET /api/classes/[classId]/stats` - Thống kê lớp
- `PATCH /api/classes/[classId]` - Update thông tin lớp (name, etc.)
- `POST /api/classes/[classId]/members` - Thêm member
- `PATCH /api/classes/[classId]/members/[userId]` - Update role/status của member
- `DELETE /api/classes/[classId]/members/[userId]` - Remove member
- `POST /api/classes/[classId]/regenerate-code` - Regenerate class code

#### 4. Chức năng quản lý thiếu

**A. Quản lý Members:**
- ❌ Xem danh sách members (students, TAs, teachers)
- ❌ Thêm member thủ công (invite by email)
- ❌ Thay đổi role (student → TA → teacher)
- ❌ Ban/remove member
- ❌ Xem thông tin member (email, name, join date, etc.)

**B. Quản lý Sessions:**
- ❌ Xem danh sách sessions đã tạo từ lớp này
- ❌ Filter sessions (active, ended, lobby)
- ❌ Xem thống kê session (số attempts, completion rate, etc.)

**C. Settings lớp:**
- ❌ Đổi tên lớp
- ❌ Regenerate class code
- ❌ Archive/delete lớp
- ❌ Xem thông tin lớp (owner, created date, member count, etc.)

**D. Thống kê:**
- ❌ Tổng số members
- ❌ Tổng số sessions
- ❌ Tổng số attempts
- ❌ Completion rate
- ❌ Average score
- ❌ Activity timeline

---

## 2️⃣ So sánh với các trang khác

### Pattern hiện tại:

#### `/dashboard/quizzes`
```
/dashboard/quizzes          → List quizzes
/dashboard/quizzes/[quizId] → Detail quiz (rules, settings, preview)
```

#### `/dashboard/question-bank`
```
/dashboard/question-bank          → List pools
/dashboard/question-bank/[poolId]  → Detail pool (questions, tags)
```

#### `/dashboard/classes` (THIẾU)
```
/dashboard/classes          → ❌ CHƯA CÓ
/dashboard/classes/[id]    → ❌ CHƯA CÓ
```

---

## 3️⃣ Đề xuất Implementation

### Phase 1: Trang List Classes (MVP)
**Route:** `/dashboard/classes`

**Features:**
- Danh sách lớp (giống `ClassroomPanel` nhưng full page)
- Tạo lớp mới
- Join lớp
- Click vào lớp → navigate đến `/dashboard/classes/[classId]`
- Stats cards: tổng lớp, tổng members, active sessions

**API cần:**
- `GET /api/classes` - Lấy danh sách lớp của user

### Phase 2: Trang Detail Class
**Route:** `/dashboard/classes/[classId]`

**Sections:**

#### 2.1 Header
- Tên lớp
- Class code (copy button)
- Owner info
- Created date
- Actions: Edit name, Regenerate code, Archive

#### 2.2 Stats Cards
- Tổng members
- Tổng sessions
- Active sessions
- Total attempts

#### 2.3 Tabs/Sections:

**Tab 1: Members**
- Danh sách members (table)
  - Name, Email, Role, Join date, Status
  - Actions: Change role, Remove, Ban
- Add member button (invite by email)
- Export members (CSV)

**Tab 2: Sessions**
- Danh sách sessions đã tạo từ lớp này
- Filter: All, Active, Ended
- Click session → navigate đến session detail
- Create session button

**Tab 3: Settings**
- Edit classroom name
- Regenerate class code
- Archive classroom
- Delete classroom (danger zone)

**Tab 4: Statistics (optional)**
- Charts: Sessions over time, Completion rate, Score distribution
- Activity log

**API cần:**
- `GET /api/classes/[classId]`
- `GET /api/classes/[classId]/members`
- `GET /api/classes/[classId]/sessions`
- `GET /api/classes/[classId]/stats`
- `PATCH /api/classes/[classId]`
- `POST /api/classes/[classId]/members`
- `PATCH /api/classes/[classId]/members/[userId]`
- `DELETE /api/classes/[classId]/members/[userId]`

---

## 4️⃣ User Stories

### Teacher:
1. **"Tôi muốn xem tất cả lớp của mình ở một trang riêng"**
   - ✅ Cần: `/dashboard/classes`

2. **"Tôi muốn xem chi tiết một lớp: ai đang tham gia, có bao nhiêu session"**
   - ✅ Cần: `/dashboard/classes/[classId]`

3. **"Tôi muốn quản lý members: thêm TA, ban student"**
   - ✅ Cần: Members management trong detail page

4. **"Tôi muốn xem tất cả sessions đã tạo từ lớp này"**
   - ✅ Cần: Sessions tab trong detail page

5. **"Tôi muốn đổi tên lớp hoặc regenerate class code"**
   - ✅ Cần: Settings tab

### Student:
1. **"Tôi muốn xem các lớp tôi đang tham gia"**
   - ✅ Cần: `/dashboard/classes` (read-only view)

2. **"Tôi muốn xem thông tin lớp: members, sessions"**
   - ✅ Cần: `/dashboard/classes/[classId]` (read-only)

---

## 5️⃣ Priority

### 🔥 High Priority (MVP)
1. **Trang `/dashboard/classes`** - List view
2. **Trang `/dashboard/classes/[classId]`** - Detail view
3. **API `GET /api/classes`** - List classes
4. **API `GET /api/classes/[classId]`** - Get class detail
5. **API `GET /api/classes/[classId]/members`** - List members
6. **API `GET /api/classes/[classId]/sessions`** - List sessions

### 🚀 Medium Priority
7. **Members management** - Add/remove/change role
8. **Settings** - Edit name, regenerate code
9. **Stats** - Basic statistics

### 💡 Low Priority (Nice to have)
10. **Advanced stats** - Charts, analytics
11. **Activity log** - Timeline of events
12. **Bulk operations** - Bulk add/remove members

---

## 6️⃣ Kết luận

**Hiện tại thiếu một trang quản lý lớp hoàn chỉnh.** 

`ClassroomPanel` chỉ là một component nhỏ nhúng trong dashboard, không đủ để quản lý lớp một cách chuyên nghiệp. Cần:

1. ✅ Tạo trang `/dashboard/classes` (list view)
2. ✅ Tạo trang `/dashboard/classes/[classId]` (detail view)
3. ✅ Implement các API endpoints cần thiết
4. ✅ Di chuyển logic từ `ClassroomPanel` sang trang riêng
5. ✅ Thêm các chức năng quản lý members, sessions, settings

**Ước tính effort:** 2-3 ngày cho MVP (list + detail + basic APIs)

