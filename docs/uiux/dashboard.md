# 📊 BKquiz – Dashboard (Teacher)

Dashboard là điểm vào chính sau khi giảng viên đăng nhập, kết nối các bounded context: Classroom, Quiz, Question Bank, Session runtime.

---

## 1. Mục tiêu & personas

- **Persona chính**: Teacher, TA.
- **Mục tiêu**:
  - Nhìn nhanh được tình hình: số lớp, số quiz, session đang chạy, số pool câu hỏi.
  - Thực hiện nhanh các hành động phổ biến:
    - Tạo lớp / join lớp.
    - Tạo session để chạy quiz.
    - Điều hướng sang Quizzes / Question Bank.

---

## 2. Cấu trúc màn hình

1. **Navbar (BaseTemplate)** – dùng chung:
   - Logo/brand: “BKquiz”.
   - Nav items: `Dashboard`, `Quizzes`, `Question bank`, `Manage your account`, `Sign out`.
   - Theme đỏ–đen: nền đen, viền đỏ nhạt, active nav có underline đỏ.

2. **Header Dashboard**:
   - Caption: `BKquiz Dashboard` (text nhỏ, muted).
   - Title: `Tổng quan`.
   - Description: “Quản lý lớp, quiz, session, và question pools.”
   - Quick actions:
     - `Tạo / quản lý Quiz` (Button primary → `/dashboard/quizzes`).
     - `Question Bank` (Button ghost → `/dashboard/question-bank`).
     - `[DEV] Đổi role` (Button ghost nhỏ, chỉ hiển thị khi `DEV_BYPASS_AUTH=1`).

3. **Row KPI (3 card)**:
   - **Classes**:
     - Số lớp active (membership).
     - Badge `active`.
     - Copy: “Số lớp bạn đang tham gia (active membership).”
     - Toàn bộ card là link → `/dashboard/classes`.
   - **Quizzes**:
     - Số quiz thuộc các lớp của user.
     - Badge `in your classes`.
     - Link → `/dashboard/quizzes`.
   - **Active sessions**:
     - Số sessions có `status=active` trong các lớp.
     - Badge: `running` (success) / `idle` (neutral).
     - Link → `/dashboard/sessions`.
   - Interaction:
     - Dùng `Card` với prop `interactive` + `cursor-pointer`.
     - Hover: border sáng hơn, nền nhích nhẹ, nhưng không đổi layout.

4. **Row “Lớp học & Sessions” + “Quick view”**:

   - **Lớp học & Sessions** (chiếm 2/3, sử dụng `ClassroomPanel`):
     - Tạo lớp (Teacher):
       - Input “Tên lớp (VD: DSA K66)”.
       - Button primary “Tạo lớp”.
     - Join lớp (Student):
       - Input class code (font-mono).
       - Button primary “Join lớp”.
     - Danh sách lớp:
       - Mỗi lớp: tên, classCode, role, và action “Tạo session” nếu là teacher/TA.

   - **Quick view** (1/3):
     - Card title: `Quick view`.
     - Subtext: “Một vài thông tin nhanh.”
     - Block 1 – Question pools (owned):
       - Heading: “Question pools (owned)”.
       - Badge info: số pool.
       - Desc: “Pools bạn sở hữu (teacher).”
       - Toàn bộ khối là link → `/dashboard/question-bank`, hover border đỏ.
     - Block 2 – Recent classes:
       - Heading: “Recent classes”.
       - List lớp gần nhất (tên + classCode mono).
       - Empty state: text nhỏ “Chưa có lớp nào. Hãy tạo hoặc join bằng class code.”

---

## 3. Trạng thái & empty state

- **Không có lớp**:
  - Classes KPI: hiển thị `0 active`.
  - Quick view → “Chưa có lớp nào…” như trên.
  - Gợi ý hành động rõ ràng: focus vào khu `Tạo lớp` và `Join lớp`.

- **Không có quiz**:
  - Quizzes KPI = 0.
  - Trên tab `Quizzes`, hiển thị empty state riêng (xem `quizzes.md`).

- **Không có pool**:
  - Question pools badge = `0`.
  - Khi click sang Question Bank sẽ thấy empty state tương ứng (xem `question-bank.md`).

---

## 4. Hành vi điều hướng

- Click vào:
  - **Classes card** → `/dashboard/classes` (hoặc `/dashboard` với anchor tới khu lớp nếu chưa tách route).
  - **Quizzes card** → `/dashboard/quizzes`.
  - **Active sessions card** → `/dashboard/sessions`.
  - **Question pools (owned)** trong Quick view → `/dashboard/question-bank`.
  - Nút “Tạo / quản lý Quiz” → `/dashboard/quizzes`.

Mục tiêu: giáo viên không cần truyện menu phức tạp; mọi entry point chính đều có ở dashboard.

---

## 5. Note kỹ thuật

- Số liệu KPI cần khớp với:
  - `quizCount`: count theo `classroomIds` active membership.
  - `poolCount`: `questionPool.count({ ownerTeacherId })`.
  - `activeSessionCount`: quizSession `status='active'` trong các classroom của user.
- Dashboard server component dùng `requireUser()` để lấy `userId` + roles; không nên gọi `auth()` trực tiếp.


