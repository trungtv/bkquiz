# Implementation Priority: Authorization vs UI/UX

## 🤔 Câu hỏi

Nên làm **Authorization (phân quyền)** trước hay **UI/UX Teacher-Student** trước?

---

## 📊 Phân tích

### Option A: Authorization trước ⭐ (Recommended)

**Ưu điểm:**
1. **Security First** - Đảm bảo student không thể truy cập teacher-only routes
2. **Foundation** - UI changes cần dựa trên role checks
3. **Consistency** - Tạo helpers (`requireTeacher`, `getUserRole`) để UI dùng
4. **Risk Mitigation** - Đóng security holes ngay lập tức

**Nhược điểm:**
- User vẫn thấy UI confusing (nhưng ít nhất không thể access được)

**Timeline:**
- Phase 1 (Core functions): 1-2 giờ
- Phase 2 (API protection): 2-3 giờ
- Phase 3 (Page protection): 1-2 giờ
- **Total: 4-7 giờ**

---

### Option B: UI/UX trước

**Ưu điểm:**
- User experience tốt hơn ngay
- Visual distinction rõ ràng

**Nhược điểm:**
- **Security risk** - Student vẫn có thể truy cập teacher-only routes (nếu biết URL)
- Phải check role manual trong UI (không có helpers)
- Có thể phải refactor lại sau khi có authorization helpers

**Timeline:**
- Priority 1: 2-3 giờ
- Nhưng vẫn cần authorization sau đó

---

### Option C: Song song (Hybrid) ⚡

**Cách làm:**
1. **Bước 1 (1-2 giờ)**: Tạo core authorization helpers
   - `requireTeacher(userId)`
   - `requireStudent(userId)`
   - `getUserRole(userId, devRole?)`

2. **Bước 2 (Song song)**:
   - **Team A**: Implement API/Page protection (dùng helpers từ Bước 1)
   - **Team B**: Implement UI changes (dùng `getUserRole()` từ Bước 1)

**Ưu điểm:**
- Security được đảm bảo sớm
- UI improvements có thể làm song song
- Tận dụng helpers ngay

**Timeline:**
- Bước 1: 1-2 giờ
- Bước 2: 4-6 giờ (song song)
- **Total: 5-8 giờ** (nhưng parallel nên thực tế ~4-5 giờ)

---

## 🎯 Đề xuất: **Option A - Authorization trước** ⭐

### Lý do:

1. **Security Critical**
   - Hiện tại student có thể truy cập `/dashboard/quizzes/` và `/dashboard/question-bank/`
   - Đây là **security vulnerability** cần fix ngay

2. **Foundation cho UI**
   - UI changes cần `getUserRole()` helper
   - Nếu làm UI trước, phải check role manual → code duplicate
   - Sau đó phải refactor lại khi có helpers

3. **Quick Win**
   - Core helpers chỉ mất 1-2 giờ
   - Sau đó có thể dùng ngay cho cả API và UI

### Implementation Order:

```
Day 1 (2-3 giờ):
├─ Step 1: Core Authorization Helpers (1-2 giờ)
│  ├─ requireTeacher(userId)
│  ├─ requireStudent(userId)
│  └─ getUserRole(userId, devRole?)
│
└─ Step 2: Critical API Protection (1 giờ)
   ├─ /api/quizzes (POST)
   ├─ /api/pools (POST)
   └─ /api/classes (POST)

Day 2 (2-3 giờ):
├─ Step 3: Page Protection (1 giờ)
│  ├─ /dashboard/quizzes/page.tsx
│  └─ /dashboard/question-bank/page.tsx
│
└─ Step 4: UI Changes (2 giờ)
   ├─ Sidebar conditional navigation
   └─ Dashboard student KPIs
```

---

## 📋 Recommended Plan

### Phase 1: Authorization Foundation (1-2 giờ)

```ts
// server/authz.ts
export async function requireTeacher(userId: string) { ... }
export async function requireStudent(userId: string) { ... }
export async function getUserRole(userId: string, devRole?: 'teacher' | 'student') { ... }
```

### Phase 2: Critical Protection (1 giờ)

- Add `requireTeacher()` to critical API routes
- Add role check to critical pages

### Phase 3: UI Improvements (2-3 giờ)

- Sidebar conditional navigation (dùng `getUserRole()`)
- Dashboard student KPIs
- Route protection cho pages

---

## ✅ Kết luận

**Nên làm Authorization trước** vì:
1. ✅ Security first - fix vulnerabilities ngay
2. ✅ Foundation - tạo helpers để UI dùng
3. ✅ Quick - core helpers chỉ mất 1-2 giờ
4. ✅ Consistency - tránh code duplicate

**Sau đó làm UI** vì:
- Đã có helpers sẵn
- Không phải refactor lại
- Code clean và maintainable

**Total timeline: 5-6 giờ** (thay vì 8-10 giờ nếu làm ngược lại)

