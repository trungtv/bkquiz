# 📚 Teacher View Questions in Session - Flow & UI/UX Design

**Tính năng**: Cho phép teacher xem tất cả câu hỏi trong quiz session đang chạy hoặc đã kết thúc.

**URL**: `/dashboard/sessions/[sessionId]/questions` (separate page)

**Ngày thiết kế**: 2025-01-XX

---

## 1. Mục tiêu & Use Cases

### 1.1. Mục tiêu
- Teacher có thể xem lại tất cả câu hỏi trong session để:
  - **Kiểm tra nội dung quiz TRƯỚC KHI bắt đầu session** (quan trọng nhất)
  - Xem lại câu hỏi sau khi session kết thúc (để phân tích, cải thiện)
  - In hoặc export danh sách câu hỏi nếu cần

### 1.2. Use Cases
1. **Trước khi start session** (Primary use case):
   - Teacher muốn xem lại câu hỏi sẽ được chọn trước khi bắt đầu
   - Đảm bảo questions đúng như mong muốn
   - Kiểm tra đáp án đúng trước khi trình chiếu
2. **Sau khi session ended**:
   - Teacher muốn xem lại và phân tích câu hỏi đã dùng
   - Review để cải thiện quiz cho lần sau

**Lưu ý**: Khi đang show Teacher Screen trên máy chiếu, teacher KHÔNG cần xem questions vì:
- Đang focus vào QR code và token
- Màn hình trình chiếu không phù hợp để xem chi tiết questions
- Teacher đã xem và kiểm tra trước khi start rồi

---

## 2. Flow & User Journey

### 2.1. Entry Points

#### Option A: Separate Page (Recommended)
- Link "View Questions" từ các entry points:
  - Dashboard → Sessions list → "View Questions" button
  - Class Detail → Sessions list → "View Questions" button
  - Quiz Detail → Sessions list → "View Questions" button
- Route: `/dashboard/sessions/[sessionId]/questions`
- Trang riêng, full-width để xem questions chi tiết

**Lý do chọn Option A**:
- ✅ Teacher xem TRƯỚC KHI start session (không phải trong Teacher Screen)
- ✅ Có đủ không gian để hiển thị questions chi tiết
- ✅ Không làm rối Teacher Screen (màn hình trình chiếu)
- ✅ Có thể bookmark hoặc share link
- ✅ Dễ export/print từ trang riêng

#### Option B: Modal từ Dashboard/Class Detail
- Button "View Questions" trong sessions list
- Mở modal overlay để xem questions
- Có thể đóng lại dễ dàng

**Lý do không chọn Option B**:
- ⚠️ Modal có thể bị giới hạn không gian cho nhiều questions
- ⚠️ Khó scroll và navigate trong modal

#### Option C: Collapsible Section trong Teacher Screen
- Thêm section "Questions" trong Teacher Screen

**Lý do không chọn Option C**:
- ❌ Teacher KHÔNG cần xem questions khi đang trình chiếu
- ❌ Làm rối Teacher Screen (màn hình trình chiếu)
- ❌ Không phù hợp với use case chính (xem TRƯỚC KHI start)

### 2.2. User Flow

```
Dashboard / Class Detail / Quiz Detail
  ↓
Sessions list
  ↓
Click "View Questions" button (chỉ hiện khi session chưa start hoặc đã ended)
  ↓
Navigate to /dashboard/sessions/[sessionId]/questions
  ↓
Hiển thị danh sách questions
  ↓
Teacher có thể:
  - Xem từng câu hỏi (scroll)
  - Navigate giữa các câu (pagination hoặc jump to)
  - Xem đáp án đúng (highlight)
  - Export/Print nếu cần
  - Quay lại để start session hoặc xem session khác
```

### 2.3. When to Show "View Questions" Button

- **Session status = 'lobby'**: Hiển thị button "View Questions" (trước khi start)
- **Session status = 'active'**: Ẩn button (teacher đang trình chiếu, không cần xem)
- **Session status = 'ended'**: Hiển thị button "View Questions" (xem lại sau khi ended)

---

## 3. UI/UX Design

### 3.1. Layout Structure

#### Page Layout (Consistent với pattern dashboard)

```tsx
// Page: /dashboard/sessions/[sessionId]/questions
// Page wrapper: <div className="py-5"> (trong page.tsx)
// Component wrapper: <div className="space-y-7 animate-fadeIn">

<div className="space-y-7 animate-fadeIn">
  {/* Breadcrumb - Consistent với các trang khác */}
  <nav className="text-sm animate-slideUp">
    <div className="flex items-center gap-2 text-text-muted">
      <Link href="/dashboard" className="hover:text-text-heading transition-colors">
        Dashboard
      </Link>
      <span>·</span>
      <Link href="/dashboard/sessions" className="hover:text-text-heading transition-colors">
        Sessions
      </Link>
      <span>·</span>
      <span className="text-text-heading">Questions</span>
    </div>
  </nav>

  {/* Header Card - Consistent với QuizDetail, ClassDetail */}
  <Card className="p-5 md:p-6 animate-slideUp">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-text-heading">
          Questions in Session
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
          {session?.quiz?.title && (
            <>
              <span>{session.quiz.title}</span>
              <span>·</span>
            </>
          )}
          {session?.classroom?.name && (
            <>
              <span>{session.classroom.name}</span>
              <span>·</span>
            </>
          )}
          <span>
            {questions.length}
            {' '}
            questions
          </span>
          {session?.status && (
            <>
              <span>·</span>
              <Badge
                variant={
                  session.status === 'active'
                    ? 'success'
                    : session.status === 'ended'
                      ? 'neutral'
                      : 'info'
                }
              >
                {session.status}
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleExport}>
          Export PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void fetchQuestions()}>
          Refresh
        </Button>
        {session?.status === 'lobby' && (
          <Link href={`/dashboard/sessions/${sessionId}/teacher`}>
            <Button variant="primary" size="sm">
              Go to Teacher Screen
            </Button>
          </Link>
        )}
        <Link href="/dashboard/sessions">
          <Button variant="ghost" size="sm">
            ← Quay lại
          </Button>
        </Link>
      </div>
    </div>
  </Card>

  {/* Questions List */}
  <div className="space-y-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
    {questions.length === 0
      ? (
          <Card className="p-8 text-center">
            <div className="text-text-muted">
              {session?.status === 'lobby'
                ? 'Session chưa bắt đầu, đang build questions...'
                : 'Chưa có questions'}
            </div>
          </Card>
        )
      : questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={questions.length}
          />
        ))}
  </div>
</div>
```

### 3.2. Questions Display

#### Option 1: List View (Recommended cho MVP)
- Hiển thị tất cả questions trong một list scrollable
- Mỗi question là một Card
- Compact nhưng đủ thông tin

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Questions (25 questions)          [Export] [Refresh] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Question 1/25                                │ │
│ │ [Badge: Chọn 1]                             │ │
│ │                                             │ │
│ │ Prompt: [MathRenderer content]             │ │
│ │                                             │ │
│ │ Options:                                    │ │
│ │   A. [Option 1] ✓ (correct)                │ │
│ │   B. [Option 2]                             │ │
│ │   C. [Option 3]                             │ │
│ │   D. [Option 4]                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Question 2/25                                │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

#### Option 2: Pagination View
- Chia questions thành pages (10-20 questions/page)
- Navigation: Previous/Next, Jump to page
- Phù hợp khi có nhiều questions (>50)

#### Option 3: Grid/Compact View
- Hiển thị nhiều questions cùng lúc
- Compact, chỉ hiển thị prompt và số options
- Click để expand xem chi tiết

**Khuyến nghị**: Bắt đầu với **Option 1 (List View)** cho MVP, có thể nâng cấp sang pagination nếu cần.

### 3.3. Question Card Design

#### Structure
```tsx
<Card className="p-5 md:p-6 mb-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-text-heading">
        Câu {index + 1}/{total}
      </span>
      <Badge variant="info">
        {question.type === 'mcq_single' ? 'Chọn 1' : 'Chọn nhiều'}
      </Badge>
    </div>
    {question.tag && (
      <Badge variant="neutral" size="sm">
        {question.tag.name}
      </Badge>
    )}
  </div>

  {/* Prompt */}
  <div className="text-base text-text-heading mb-4">
    <MathRenderer content={question.prompt} />
  </div>

  {/* Options */}
  <div className="space-y-2">
    {question.options.map((option, optIdx) => {
      const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...
      const isCorrect = option.isCorrect;
      return (
        <div
          key={optIdx}
          className={cn(
            'flex items-start gap-3 p-3 rounded border',
            isCorrect
              ? 'bg-success/10 border-success/30'
              : 'bg-bg-section border-border-subtle'
          )}
        >
          <span className="font-mono text-sm text-text-muted min-w-[24px]">
            {optionLabel}.
          </span>
          <div className="flex-1 text-sm text-text-body">
            <MathRenderer content={option.content} />
          </div>
          {isCorrect && (
            <span className="text-success text-xs font-semibold">
              ✓ Đúng
            </span>
          )}
        </div>
      );
    })}
  </div>
</Card>
```

### 3.4. Visual Design

#### Colors & Styling
- **Page background**: `bg-bg-primary` (dark theme)
- **Card background**: `bg-bg-section` hoặc `bg-white/5`
- **Border**: `border-border-subtle`
- **Text**: `text-text-heading` cho prompt, `text-text-body` cho options
- **Correct answer**: Highlight với `bg-green-500/20 border-green-500/50` hoặc `bg-success/10 border-success/30`
- **Badge**: Dùng Badge component với variant phù hợp

#### Spacing
- Card padding: `p-4` hoặc `p-5`
- Gap giữa questions: `mb-4`
- Options spacing: `space-y-2`

#### Typography
- Question number: `text-sm font-semibold`
- Prompt: `text-base`
- Options: `text-sm`
- Tags: `text-xs`

### 3.5. Features & Interactions

#### 3.5.1. View Modes (Optional - Phase 2)
- **Full View**: Hiển thị đầy đủ prompt + options + đáp án
- **Compact View**: Chỉ hiển thị prompt + số options (click để expand)
- **Answer Key Only**: Chỉ hiển thị đáp án đúng (ẩn options sai)

#### 3.5.2. Navigation
- **Scroll**: Scroll tự nhiên trong list
- **Jump to Question**: Input field để jump đến câu số X
- **Keyboard shortcuts** (Phase 2):
  - `J` / `K`: Navigate lên/xuống
  - `G` + số: Jump to question

#### 3.5.3. Export/Print
- **Export PDF**: Button để export tất cả questions ra PDF
- **Print**: Browser print (có thể style riêng cho print)
- **Copy**: Copy prompt + options (text format)

#### 3.5.4. Filter/Search (Optional - Phase 2)
- Filter theo tag
- Search trong prompt
- Filter theo type (mcq_single vs mcq_multi)

---

## 4. API Design

### 4.1. Endpoint

```
GET /api/sessions/[sessionId]/questions
```

### 4.2. Authorization
- Chỉ teacher có quyền xem session mới được truy cập
- Check authorization:
  1. Teacher phải là owner của quiz (`quiz.createdByTeacherId === userId`)
  2. Hoặc teacher là member của classroom với role `teacher` hoặc `ta` (`ClassMembership.roleInClass IN ('teacher', 'ta')`)
- Implementation: Check tương tự như `/api/sessions/[sessionId]/teacherToken` hoặc `/api/sessions/[sessionId]/report/scoreboard`

### 4.3. Response

```typescript
{
  questions: Array<{
    id: string; // SessionQuestionSnapshot.id
    order: number;
    type: 'mcq_single' | 'mcq_multi';
    prompt: string;
    sourceQuestionId: string; // ID của question gốc (optional, có thể bỏ)
    options: Array<{
      order: number;
      content: string;
      isCorrect: boolean; // Teacher cần thấy đáp án đúng
    }>;
    tag?: { // Optional, chỉ có nếu tagId không null
      id: string;
      name: string;
      normalizedName: string;
    };
  }>;
  total: number;
  sessionId: string;
}
```

**Lưu ý về schema Prisma:**
- `SessionQuestionSnapshot` có:
  - `id`, `sessionId`, `sourceQuestionId`, `tagId` (nullable), `type`, `prompt`, `order`
  - Relation `options`: `SessionOptionSnapshot[]` với `order`, `content`, `isCorrect`
  - Relation `tag`: `Tag?` (nullable) với `id`, `name`, `normalizedName`
- Query cần include:
  - `options: { orderBy: { order: 'asc' }, select: { order, content, isCorrect } }`
  - `tag: { select: { id, name, normalizedName } }` (nếu tagId không null)

### 4.4. Behavior
- Nếu session chưa start (status = 'lobby'):
  - Build snapshot nếu chưa có (`buildSessionSnapshotIfNeeded`)
  - Nếu snapshot đã được build (có thể build trước khi start):
    - Trả về questions từ `SessionQuestionSnapshot`
  - Nếu snapshot chưa build:
    - Trả về empty array với message "Session chưa bắt đầu, chưa có questions"
- Nếu session đã start (status = 'active' | 'ended'):
  - Build snapshot nếu chưa có (`buildSessionSnapshotIfNeeded`)
  - Trả về questions từ `SessionQuestionSnapshot`
  - Order theo `order` field (ascending)

### 4.5. Error Cases
- `SESSION_NOT_FOUND`: Session không tồn tại
- `FORBIDDEN`: Teacher không có quyền xem session này (không phải owner của quiz hoặc không phải member của classroom)
- `SESSION_NOT_STARTED`: Session chưa start và snapshot chưa được build (optional, có thể trả về empty array thay vì error)

### 4.6. Implementation Example

```typescript
// app/api/sessions/[sessionId]/questions/route.ts
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

export async function GET(_: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { userId } = await requireUser();
  const { sessionId } = await ctx.params;

  // Check session exists and teacher has permission
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      quiz: {
        select: {
          id: true,
          createdByTeacherId: true,
          classroom: {
            select: {
              id: true,
              memberships: {
                where: {
                  userId,
                  status: 'active',
                  roleInClass: { in: ['teacher', 'ta'] },
                },
                select: { roleInClass: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // Check authorization: teacher must be quiz owner OR classroom member
  const isOwner = session.quiz.createdByTeacherId === userId;
  const isMember = session.quiz.classroom.memberships.length > 0;
  
  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Build snapshot if needed (will check internally if already built)
  await buildSessionSnapshotIfNeeded(sessionId);

  // Query questions from snapshot
  const questions = await prisma.sessionQuestionSnapshot.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      prompt: true,
      sourceQuestionId: true,
      options: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          content: true,
          isCorrect: true,
        },
      },
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
  });

  return NextResponse.json({
    questions: questions.map(q => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      sourceQuestionId: q.sourceQuestionId,
      options: q.options,
      tag: q.tag || undefined, // Convert null to undefined
    })),
    total: questions.length,
    sessionId,
  });
}
```

---

## 5. Implementation Plan

### Phase 1: MVP (Must Have)
- [ ] API endpoint: `GET /api/sessions/[sessionId]/questions`
- [ ] Separate page: `/dashboard/sessions/[sessionId]/questions`
- [ ] Page wrapper: `<div className="py-5">` trong `page.tsx` (consistent với các trang khác)
- [ ] Component wrapper: `<div className="space-y-7 animate-fadeIn">` (consistent pattern)
- [ ] Breadcrumb: Format `Dashboard · Sessions · Questions` với `·` separator (consistent)
- [ ] Header Card: `<Card className="p-5 md:p-6">` với title, metadata, actions (consistent)
- [ ] "View Questions" button trong sessions list (chỉ hiện khi status = 'lobby' hoặc 'ended')
- [ ] List view hiển thị tất cả questions
- [ ] Question card với prompt, options, đáp án đúng (highlight)
- [ ] Badge cho question type (Chọn 1 / Chọn nhiều)
- [ ] Loading state khi fetch questions
- [ ] Error handling
- [ ] Empty state khi chưa có questions

### Phase 2: Enhancements (Nice to Have)
- [ ] Pagination cho list dài (>50 questions)
- [ ] Jump to question input
- [ ] Export PDF functionality
- [ ] Print styling
- [ ] Filter by tag
- [ ] Search trong prompt
- [ ] Compact view mode
- [ ] Keyboard shortcuts

### Phase 3: Advanced (Future)
- [ ] Statistics: Phân tích độ khó, tỷ lệ đúng/sai
- [ ] Comparison: So sánh với quiz gốc
- [ ] Edit questions (nếu cần)
- [ ] Share questions link

---

## 6. Edge Cases & Considerations

### 6.1. Session Status
- **Lobby**: 
  - Build snapshot nếu chưa có (`buildSessionSnapshotIfNeeded`)
  - Show questions từ snapshot (nếu đã build)
  - Nếu chưa build: Show message "Session chưa bắt đầu, đang build questions..."
- **Active**: 
  - Đã có snapshot → Show questions từ snapshot
  - **Lưu ý**: Button "View Questions" nên ẩn khi status = 'active' (teacher đang trình chiếu)
- **Ended**: 
  - Đã có snapshot → Show questions từ snapshot (read-only)

### 6.2. Large Number of Questions
- Nếu có >100 questions:
  - Cân nhắc pagination
  - Hoặc virtual scrolling
  - Hoặc lazy loading

### 6.3. Math Rendering
- Sử dụng `MathRenderer` component (giống student attempt page)
- Đảm bảo LaTeX render đúng

### 6.4. Performance
- Questions có thể nhiều → Cân nhắc pagination hoặc virtual scrolling
- Math rendering có thể chậm → Lazy load hoặc debounce

### 6.5. Privacy/Security
- Teacher chỉ xem được questions trong session của mình
- Không expose đáp án cho student (chỉ teacher screen)
- Export PDF có thể cần watermark hoặc metadata

---

## 7. Design Decisions

### 7.1. Tại sao separate page thay vì collapsible section trong Teacher Screen?
- ✅ Teacher xem questions TRƯỚC KHI start session (không phải trong Teacher Screen)
- ✅ Khi đang trình chiếu Teacher Screen, teacher không cần xem questions nữa
- ✅ Separate page có đủ không gian để hiển thị questions chi tiết
- ✅ Không làm rối Teacher Screen (màn hình trình chiếu)
- ✅ Có thể bookmark hoặc share link
- ✅ Dễ export/print từ trang riêng

### 7.2. Tại sao highlight đáp án đúng?
- ✅ Teacher cần biết đáp án để trả lời câu hỏi của sinh viên
- ✅ Giúp teacher review và phân tích questions
- ✅ Không ảnh hưởng đến student (chỉ teacher screen)

### 7.3. Tại sao không cho edit questions trong session?
- ⚠️ Questions đã được snapshot, không nên thay đổi
- ⚠️ Nếu edit, sẽ không consistent với attempts của students
- ✅ Nếu cần edit, nên edit quiz gốc và tạo session mới

### 7.4. Có cần hiển thị tags không?
- ✅ Tags giúp teacher hiểu context của question
- ✅ Có thể filter theo tag (Phase 2)
- ⚠️ Tags có thể không có trong snapshot → Optional

---

## 8. Examples & Mockups

### 8.1. Page Layout (Consistent với dashboard pattern)
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard · Sessions · Questions                            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Questions in Session          [Export] [Refresh] [←]    │ │
│ │ Quiz Title · Class Name · 25 questions · [lobby]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Câu 1/25                    [stack]                     │ │
│ │ [Badge: Chọn 1]                                         │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 8.2. Questions List (First Question)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Câu 1/25                    [stack] [basics]            │ │
│ │ [Badge: Chọn 1]                                         │ │
│ │                                                         │ │
│ │ Stack là cấu trúc dữ liệu hoạt động theo nguyên tắc    │ │
│ │ nào?                                                   │ │
│ │                                                         │ │
│ │ A. LIFO (Last In, First Out)                  ✓ Đúng   │ │
│ │ B. FIFO (First In, First Out)                         │ │
│ │ C. Random                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Câu 2/25                                               │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Testing Checklist

### 9.1. Functional Testing
- [ ] API trả về questions đúng format
- [ ] Questions hiển thị đúng order
- [ ] Đáp án đúng được highlight
- [ ] Math rendering hoạt động
- [ ] Breadcrumb navigation hoạt động
- [ ] Loading state hiển thị
- [ ] Error handling khi API fail
- [ ] Empty state hiển thị khi chưa có questions
- [ ] Buttons (Export, Refresh, Go to Teacher Screen, Quay lại) hoạt động

### 9.2. Edge Cases
- [ ] Session chưa start (lobby)
- [ ] Session active
- [ ] Session ended
- [ ] Session không có questions
- [ ] Questions có nhiều options (>6)
- [ ] Questions có LaTeX phức tạp
- [ ] Questions có tags và không có tags

### 9.3. UI/UX Testing
- [ ] Responsive trên mobile/tablet
- [ ] Scroll smooth
- [ ] Colors contrast đủ
- [ ] Typography readable
- [ ] Spacing consistent với các trang dashboard khác
- [ ] Layout consistent với pattern: `space-y-7`, Card `p-5 md:p-6`
- [ ] Breadcrumb format consistent: `Dashboard · Section · Current`
- [ ] Animation consistent: `animate-fadeIn`, `animate-slideUp`

---

## 10. References

- `docs/uiux/teacher-session-review.md` - Teacher Screen review
- `docs/uiux/session-teacher.md` - Teacher Session spec
- `docs/uiux/attempt-student.md` - Student attempt page (reference cho question display)
- `docs/uiux/guidelines.md` - Design guidelines
- Current implementation: 
  - Teacher Screen: `src/app/[locale]/(auth)/dashboard/sessions/[sessionId]/teacher/teacherScreen.tsx`
  - Sessions list: `src/app/[locale]/(auth)/dashboard/classes/[classId]/TeacherClassDetail.tsx`

---

## 11. Open Questions

1. **Có cần hiển thị statistics không?** (VD: Tỷ lệ đúng/sai của từng question)
   - → Phase 2 hoặc Phase 3

2. **Có cần cho phép teacher edit questions trong session không?**
   - → Không, vì đã snapshot

3. **Có cần export với format khác không?** (Excel, JSON)
   - → Phase 2, bắt đầu với PDF

4. **Có cần hiển thị metadata không?** (VD: Question ID, source pool)
   - → Optional, có thể thêm vào Phase 2

---

## 12. Consistency Review với Dashboard Pattern

### 12.1. Điểm phù hợp với pattern chung

#### Separate Page Approach
- ✅ Đúng: Separate page thay vì collapsible trong Teacher Screen
- ✅ Phù hợp với use case: Xem TRƯỚC KHI start session
- ✅ Consistent với pattern: Quiz Detail, Class Detail, Question Pool Detail đều là separate pages

#### Entry Points
- ✅ Đúng: Button "View Questions" từ sessions list
- ✅ Conditional display: Chỉ hiện khi status = 'lobby' hoặc 'ended'
- ✅ Phù hợp với pattern: Tương tự "View Details" trong các list khác

### 12.2. Điều chỉnh đã thực hiện để consistent

#### Layout Structure
**Pattern chung (từ code)**:
- Wrapper: `<div className="space-y-7 animate-fadeIn">`
- Breadcrumb: Standalone `<nav>` với `animate-slideUp`
- Header: Trong `<Card className="p-5 md:p-6">`
- Content: Direct children với spacing

**Đã áp dụng trong thiết kế**:
```tsx
// ✅ Đúng pattern (như QuizDetail, ClassDetail)
<div className="space-y-7 animate-fadeIn">
  <nav className="text-sm animate-slideUp">
    {/* breadcrumb */}
  </nav>
  <Card className="p-5 md:p-6 animate-slideUp">
    {/* header với title, metadata, actions */}
  </Card>
  <div className="space-y-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
    {/* questions list */}
  </div>
</div>
```

#### Breadcrumb Format
**Pattern chung**:
- Format: `Dashboard · Sessions · Questions`
- Separator: `·` (middle dot)
- Links: `hover:text-text-heading transition-colors`
- Current: `text-text-heading`

**Đã áp dụng trong thiết kế**:
```tsx
// ✅ Đúng pattern
<Link href="/dashboard" className="hover:text-text-heading transition-colors">
  Dashboard
</Link>
<span>·</span>
<Link href="/dashboard/sessions" className="hover:text-text-heading transition-colors">
  Sessions
</Link>
<span>·</span>
<span className="text-text-heading">Questions</span>
```

#### Header Card Structure
**Pattern chung**:
- Header trong Card: `<Card className="p-5 md:p-6">`
- Layout: `flex items-start justify-between gap-4`
- Title: `text-2xl font-semibold text-text-heading`
- Metadata: `text-sm text-text-muted` với `·` separator
- Actions: Buttons ở bên phải, `flex items-center gap-2`

**Đã áp dụng trong thiết kế**:
- ✅ Header Card với `p-5 md:p-6 animate-slideUp`
- ✅ Layout `flex items-start justify-between gap-4`
- ✅ Title `text-2xl font-semibold text-text-heading`
- ✅ Metadata với `·` separator
- ✅ Actions ở bên phải với `flex items-center gap-2`
- ✅ Button "← Quay lại" consistent với các trang khác

#### Spacing & Animation
**Pattern chung**:
- Main wrapper: `space-y-7`
- Card padding: `p-5 md:p-6`
- Animation: `animate-fadeIn` cho wrapper, `animate-slideUp` cho sections
- Animation delay: `style={{ animationDelay: '150ms' }}` cho sections tiếp theo

**Đã áp dụng trong thiết kế**:
- ✅ Wrapper: `space-y-7 animate-fadeIn`
- ✅ Breadcrumb: `animate-slideUp`
- ✅ Header Card: `animate-slideUp`
- ✅ Questions list: `animate-slideUp` với delay `150ms`

#### Page Wrapper
**Pattern chung**:
- Page file (`page.tsx`): `<div className="py-5">` wrapper
- Component: Wrapper riêng với `space-y-7`

**Đã áp dụng trong thiết kế**:
```tsx
// page.tsx
export default async function QuestionsPage(...) {
  return (
    <div className="py-5">
      <QuestionsView sessionId={sessionId} userId={userId} />
    </div>
  );
}

// QuestionsView component
export function QuestionsView(...) {
  return (
    <div className="space-y-7 animate-fadeIn">
      {/* content */}
    </div>
  );
}
```

### 12.3. Kết luận Consistency

Sau khi điều chỉnh, thiết kế đã **consistent với pattern chung** của dashboard:
- ✅ Layout structure: `space-y-7` với Card-based header
- ✅ Breadcrumb format: `Dashboard · Section · Current`
- ✅ Header Card: Title + metadata + actions
- ✅ Spacing & animation: Consistent với các trang khác
- ✅ Page wrapper: `py-5` trong page.tsx

Thiết kế hiện tại **phù hợp với tổng thể** và **style chung** của hệ thống.

---

**Kết luận**: Thiết kế này tập trung vào MVP với **separate page** để teacher xem questions **TRƯỚC KHI start session**. Khi đang trình chiếu Teacher Screen, teacher không cần xem questions nữa. Thiết kế đã được điều chỉnh để **consistent với pattern chung** của dashboard (QuizDetail, ClassDetail, QuestionPoolDetail). Có thể mở rộng thêm features trong Phase 2/3.
