# UI/UX Review: Student Review After Submit

**Date**: 2025-01-XX  
**Status**: 🔴 **CRITICAL GAP - Missing Feature**

---

## 📋 Tổng quan

Hiện tại, **student KHÔNG THỂ xem lại bài làm** sau khi submit để:
- Xem đáp án đúng/sai
- Hiểu tại sao mình sai
- Rút kinh nghiệm cho lần sau

Đây là một **thiếu sót nghiêm trọng** về tính năng học tập (learning feature).

---

## ⏰ Yêu cầu về Timing và Cấu hình

### 1. **Timing Logic - Khi nào cho phép xem?**

Student chỉ được xem kết quả khi **TẤT CẢ** các điều kiện sau đều đúng:

1. ✅ **Session đã kết thúc** (`session.status === 'ended'`)
2. ✅ **Đã qua thời gian delay**: `now >= session.endedAt + reviewDelayMinutes`
   - `reviewDelayMinutes` được cấu hình khi tạo session (null = không cho xem, số = phút)
3. ✅ **Có cấu hình cho phép**: `session.settings.reviewDelayMinutes !== null`
4. ✅ **Attempt đã submit**: `attempt.status === 'submitted'`

**Logic tính toán:**
```typescript
function canReviewAttempt(
  session: QuizSession,
  attempt: Attempt,
  now: Date
): boolean {
  // 1. Session phải ended
  if (session.status !== 'ended' || !session.endedAt) {
    return false;
  }
  
  // 2. Attempt phải submitted
  if (attempt.status !== 'submitted') {
    return false;
  }
  
  // 3. Check reviewDelayMinutes
  const settings = session.settings as {
    reviewDelayMinutes?: number | null;
    bufferMinutes?: number;
    durationSeconds?: number;
  } | null;
  
  const reviewDelayMinutes = settings?.reviewDelayMinutes ?? null;
  if (reviewDelayMinutes === null) {
    return false; // Teacher không cho phép xem
  }
  
  // 4. Check review delay time
  const reviewAvailableAt = new Date(
    session.endedAt.getTime() + reviewDelayMinutes * 60 * 1000
  );
  
  return now >= reviewAvailableAt;
}
```

### 2. **Cấu hình trong Session Settings**

**Thêm field mới vào `settings` JSONB:**
```typescript
{
  sessionName?: string;
  durationSeconds?: number;
  scheduledStartAt?: string;
  bufferMinutes?: number;
  reviewDelayMinutes?: number | null; // NEW: Phút sau khi session kết thúc mới cho xem (null = không cho xem)
}
```

**Default behavior:**
- `reviewDelayMinutes: null` (mặc định KHÔNG cho phép, để đảm bảo tính bảo mật)
- Teacher phải **chủ động chọn** thời gian delay khi tạo session
- Options: `null` (không cho xem), `10`, `30`, `60` phút

### 3. **UI cho Teacher khi tạo Session**

**Thêm select dropdown trong create session modal:**
```tsx
<label htmlFor="reviewDelayMinutes" className="mb-2 block text-sm font-medium">
  Cho phép xem lại đáp án
</label>
<select
  id="reviewDelayMinutes"
  value={reviewDelayMinutes === null ? '' : reviewDelayMinutes}
  onChange={e => setReviewDelayMinutes(e.target.value === '' ? null : Number(e.target.value))}
>
  <option value="">Không cho xem lại đáp án</option>
  <option value="10">Cho xem lại sau 10 phút</option>
  <option value="30">Cho xem lại sau 30 phút</option>
  <option value="60">Cho xem lại sau 60 phút</option>
</select>
```

---

## 🔴 Vấn đề hiện tại

### 1. **Sau khi submit, student không thể xem đáp án**

**Flow hiện tại:**
```
Student làm bài → Submit → Thấy điểm số → ❌ KHÔNG THỂ XEM LẠI
```

**Vấn đề:**
- Khi `attempt.status === 'submitted'`, trang `/attempt/[attemptId]` vẫn hiển thị câu hỏi
- Nhưng **KHÔNG hiển thị đáp án đúng**
- **KHÔNG highlight** đáp án student đã chọn (đúng/sai)
- **KHÔNG hiển thị điểm** cho từng câu hỏi
- Student chỉ biết tổng điểm, không biết mình sai ở đâu

### 2. **API không trả về thông tin đáp án đúng**

**File**: `/api/attempts/[attemptId]/questions/route.ts`
- API này chỉ trả về `options: { order, content }`
- **KHÔNG trả về `isCorrect`** cho options
- Do đó frontend không thể hiển thị đáp án đúng

### 3. **Không có trang review riêng**

- Không có route `/attempt/[attemptId]/review`
- Không có component riêng để review
- Tất cả logic đều trong `studentAttempt.tsx` nhưng không xử lý review mode

---

## ✅ Đề xuất giải pháp

### Phase 1: API Changes (Backend)

#### 1.1 Cập nhật `/api/attempts/[attemptId]/questions`

**Thay đổi:**
- **Chỉ trả về `isCorrect`** khi **TẤT CẢ** điều kiện sau đều đúng:
  1. `attempt.status === 'submitted'`
  2. `session.status === 'ended'`
  3. `now >= session.endedAt + bufferMinutes`
  4. `session.settings.allowReview === true`
- Trả về `studentSelected: number[]` (đáp án student đã chọn) cho mỗi câu hỏi
- Trả về `questionScore: number` (điểm cho từng câu, nếu có partial credit)
- Trả về `canReview: boolean` và `reviewAvailableAt: string | null` để frontend biết khi nào có thể xem

**Code example (with server-side security):**
```typescript
// In /api/attempts/[attemptId]/questions/route.ts
import { requireAttemptAccess, requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;

  // ✅ Security: Check user owns this attempt
  try {
    await requireAttemptAccess(userId, attemptId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error === 'ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      sessionId: true,
      quizSession: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          settings: true, // JSONB field
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
  }

  const session = attempt.quizSession;
  const settings = session.settings as {
    allowReview?: boolean;
    bufferMinutes?: number;
    durationSeconds?: number;
  } | null;

  // ✅ SECURITY: Server-side time check (không thể hack)
  const now = new Date(); // Server time
  const canReview = 
    attempt.status === 'submitted' &&
    session.status === 'ended' &&
    session.endedAt !== null &&
    settings?.allowReview === true &&
    (() => {
      const bufferMinutes = settings.bufferMinutes ?? 5;
      const reviewAvailableAt = new Date(
        session.endedAt.getTime() + bufferMinutes * 60 * 1000
      );
      return now >= reviewAvailableAt; // ✅ Server-side comparison
    })();

const reviewAvailableAt = session.endedAt && settings?.allowReview
  ? new Date(
      session.endedAt.getTime() + (settings.bufferMinutes ?? 5) * 60 * 1000
    )
  : null;

const raw = await prisma.sessionQuestionSnapshot.findMany({
  where: { sessionId: attempt.sessionId },
  orderBy: { order: 'asc' },
  select: {
    id: true,
    type: true,
    prompt: true,
    order: true,
    options: {
      orderBy: { order: 'asc' },
      select: {
        order: true,
        content: true,
        ...(canReview ? { isCorrect: true } : {}), // Only include if can review
      },
    },
  },
});

// Get student's answers
const answers = attempt.status === 'submitted'
  ? await prisma.answer.findMany({
      where: { attemptId },
      select: { sessionQuestionId: true, selected: true },
    })
  : [];

const answerMap = new Map(answers.map(a => [a.sessionQuestionId, a.selected]));

// Get question scores from cache (calculated when submit)
const questionScores = canReview && attempt.questionScores
  ? (attempt.questionScores as Record<string, number>)
  : null;

// Return questions with student answers if can review
return NextResponse.json({
  questions: raw.map(q => ({
    ...q,
    ...(canReview ? {
      studentSelected: answerMap.get(q.id) || [],
      questionScore: questionScores?.get(q.id) ?? null,
    } : {}),
  })),
  canReview,
  reviewAvailableAt: reviewAvailableAt?.toISOString() ?? null,
  attemptStatus: attempt.status,
  sessionStatus: session.status,
});
```

#### 1.2 Tạo API mới `/api/attempts/[attemptId]/review` (Optional)

Nếu muốn tách riêng, có thể tạo endpoint mới:
- `GET /api/attempts/[attemptId]/review`
- Trả về đầy đủ thông tin: questions, correct answers, student answers, scores

---

### Phase 2: UI Changes (Frontend)

#### 2.1 Cập nhật `studentAttempt.tsx` để hiển thị review mode

**Khi `canReview === true` (tất cả điều kiện đều đúng):**

1. **Hiển thị tổng điểm nổi bật**
   ```tsx
   <Card className="border-success bg-success/10 p-6">
     <div className="text-center">
       <div className="text-4xl font-bold text-success mb-2">
         {state.score?.toFixed(1)} / {questions.length}
       </div>
       <div className="text-sm text-text-muted">
         Đã hoàn thành bài làm
       </div>
     </div>
   </Card>
   ```

2. **Highlight đáp án đúng (màu xanh)**
   ```tsx
   {option.isCorrect && (
     <div className="absolute right-2 top-2">
       <Badge variant="success" className="text-xs">✓ Đúng</Badge>
     </div>
   )}
   ```

3. **Highlight đáp án student đã chọn**
   - Nếu đúng: border xanh + background xanh nhạt
   - Nếu sai: border đỏ + background đỏ nhạt
   ```tsx
   const isSelected = studentSelected.includes(option.order);
   const isCorrect = option.isCorrect;
   const isCorrectAnswer = isSelected && isCorrect;
   const isWrongAnswer = isSelected && !isCorrect;
   
   <label className={cn(
     "relative rounded-md border-2 p-3 transition-all",
     isCorrectAnswer && "border-success bg-success/10",
     isWrongAnswer && "border-danger bg-danger/10",
     isCorrect && !isSelected && "border-success/30 bg-success/5", // Correct but not selected
   )}>
     {/* Option content */}
   </label>
   ```

4. **Hiển thị điểm cho từng câu** (nếu có partial credit)
   ```tsx
   <div className="mt-2 text-xs text-text-muted">
     Điểm: {questionScore.toFixed(2)} / 1.00
   </div>
   ```

5. **Thống kê tổng quan**
   ```tsx
   <Card className="p-4">
     <div className="grid grid-cols-3 gap-4 text-center">
       <div>
         <div className="text-2xl font-bold text-success">{correctCount}</div>
         <div className="text-xs text-text-muted">Đúng</div>
       </div>
       <div>
         <div className="text-2xl font-bold text-danger">{wrongCount}</div>
         <div className="text-xs text-text-muted">Sai</div>
       </div>
       <div>
         <div className="text-2xl font-bold text-text-heading">{totalScore.toFixed(1)}</div>
         <div className="text-xs text-text-muted">Tổng điểm</div>
       </div>
     </div>
   </Card>
   ```

#### 2.2 Disable tương tác khi đã submit

- Tất cả options phải là `read-only`
- Không cho phép chọn/bỏ chọn
- Hiển thị rõ ràng "Đã nộp bài - Chế độ xem lại"

---

### Phase 3: Navigation & Access

#### 3.1 Thêm link "Xem lại bài làm" từ các trang

**Từ SessionsPanel:**
- Khi click vào ended session có attempt, link đến `/attempt/[attemptId]` (review mode)

**Từ Class Detail:**
- Tương tự, link đến review mode

**Từ Performance Panel:**
- Thêm cột "Xem lại" cho mỗi attempt đã submit

#### 3.2 Breadcrumb cho review page

```
Dashboard → My Sessions → [Session Name] → Xem lại bài làm
```

---

## 🎨 Design Mockup

### Review Mode Layout

```
┌─────────────────────────────────────────┐
│  [Breadcrumb]                          │
├─────────────────────────────────────────┤
│  ✅ Bài làm đã hoàn thành               │
│  Điểm: 7.5 / 10                         │
│  Đúng: 7 | Sai: 3                       │
├─────────────────────────────────────────┤
│  [Question Navigation Grid]             │
│  [1] [2] [3] [4] [5] ...                │
│  ✓ Đúng  ✗ Sai  ○ Chưa trả lời         │
├─────────────────────────────────────────┤
│  Câu 1 / 10                             │
│  ┌───────────────────────────────────┐ │
│  │ [Question Prompt]                 │ │
│  │                                    │ │
│  │ A. [Option 1] ✓ Đúng (bạn chọn)    │ │
│  │ B. [Option 2]                      │ │
│  │ C. [Option 3] ✗ Sai (bạn chọn)    │ │
│  │ D. [Option 4] ✓ Đúng              │ │
│  │                                    │ │
│  │ Điểm: 0.00 / 1.00                  │ │
│  └───────────────────────────────────┘ │
│  [Trước] [Sau]                         │
└─────────────────────────────────────────┘
```

### Color Scheme

- **Đáp án đúng**: `border-success bg-success/10` + badge "✓ Đúng"
- **Đáp án sai (student chọn)**: `border-danger bg-danger/10` + badge "✗ Sai"
- **Đáp án đúng (student không chọn)**: `border-success/30 bg-success/5` (nhẹ hơn)
- **Tổng điểm**: Large, bold, success color

---

## 📝 Implementation Checklist

### Backend
- [ ] Thêm `reviewDelayMinutes: number | null` vào session creation schema và UI (dropdown với options: null, 10, 30, 60 phút)
- [ ] **Database migration**: Thêm `questionScores` JSONB field vào Attempt model
- [ ] Cập nhật `/api/attempts/[attemptId]/submit`:
  - [ ] Tính điểm từng câu khi submit
  - [ ] Lưu `questionScores` vào database (cache)
- [ ] Cập nhật `/api/attempts/[attemptId]/questions`:
  - [ ] **✅ SECURITY: Tất cả timing checks PHẢI server-side**
  - [ ] Check tất cả điều kiện (submitted, ended, reviewDelayMinutes) **ở server**
  - [ ] Dùng `new Date()` **server-side** để check time (KHÔNG trust client)
  - [ ] Chỉ trả về `isCorrect` khi `canReview === true` (server-side check)
  - [ ] Trả về `canReview`, `reviewAvailableAt` flags
  - [ ] Trả về `studentSelected` cho mỗi câu hỏi
  - [ ] **Lấy `questionScore` từ cache** (database), không tính lại
  - [ ] Fallback: Nếu cache không có, tính toán on-demand (backward compatibility)
- [ ] **✅ SECURITY: Validation**
  - [ ] Chỉ student sở hữu attempt mới xem được (`requireAttemptAccess`)
  - [ ] Không trả về `isCorrect` nếu không đủ điều kiện
  - [ ] Server-side time validation cho mọi check
- [ ] Test edge cases:
  - [ ] Session ended nhưng chưa qua buffer → `canReview = false`
  - [ ] Session ended, qua buffer nhưng `allowReview = false` → `canReview = false`
  - [ ] Session ended, qua buffer, `allowReview = true` nhưng attempt chưa submit → `canReview = false`
  - [ ] **Security test: Client hack time → Server vẫn reject**

### Frontend
- [ ] **Teacher UI**: Thêm checkbox `allowReview` trong create session modal
- [ ] Cập nhật type definitions để include:
  - [ ] `isCorrect`, `studentSelected`, `questionScore`
  - [ ] `canReview`, `reviewAvailableAt`
- [ ] **Review mode UI** khi `canReview === true`:
  - [ ] Highlight đáp án đúng (xanh)
  - [ ] Highlight đáp án student chọn (xanh nếu đúng, đỏ nếu sai)
  - [ ] Hiển thị tổng điểm nổi bật
  - [ ] Hiển thị thống kê (đúng/sai/tổng)
  - [ ] Hiển thị điểm từng câu (nếu có `questionScore`)
  - [ ] Disable tất cả interactions (read-only mode)
- [ ] **Waiting state UI** khi `submitted` nhưng `canReview === false`:
  - [ ] Hiển thị thông báo "Chưa thể xem kết quả"
  - [ ] Hiển thị countdown đến khi có thể xem (nếu có `reviewAvailableAt`)
  - [ ] Giải thích lý do (session chưa ended, chưa qua buffer, teacher không cho phép)
- [ ] Thêm breadcrumb
- [ ] Responsive design cho mobile

### Testing
- [ ] **Timing tests:**
  - [ ] Session ended, chưa qua buffer → không hiển thị đáp án
  - [ ] Session ended, qua buffer, `allowReview = true` → hiển thị đáp án
  - [ ] Session ended, qua buffer, `allowReview = false` → không hiển thị đáp án
  - [ ] Session chưa ended → không hiển thị đáp án
- [ ] **Question type tests:**
  - [ ] Single-select questions
  - [ ] Multi-select questions
- [ ] **Scoring tests:**
  - [ ] Partial credit scoring
  - [ ] All-or-nothing scoring
  - [ ] Penalty scoring
- [ ] **UI tests:**
  - [ ] Mobile view
  - [ ] Waiting state UI
  - [ ] Review mode UI
- [ ] **Edge cases:**
  - [ ] Attempt chưa submit (không hiển thị đáp án)
  - [ ] Student không sở hữu attempt (403 error)
  - [ ] Session không tồn tại (404 error)

---

## 🚀 Priority

**🔴 CRITICAL - High Priority**

Đây là tính năng **cần thiết** cho mục đích học tập. Student cần xem lại bài làm để:
- Hiểu tại sao mình sai
- Học từ lỗi
- Cải thiện cho lần sau

**Không có tính năng này, platform chỉ là công cụ kiểm tra, không phải công cụ học tập.**

---

## ⚠️ Edge Cases & Considerations

### 1. **Timing Edge Cases**

**Case 1: Session ended nhưng chưa qua buffer**
- Student submit xong, session ended ngay
- Nhưng phải đợi thêm `bufferMinutes` mới được xem
- **UI**: Hiển thị countdown "Kết quả sẽ hiển thị sau: X phút"

**Case 2: Session ended, nhưng `reviewDelayMinutes = null`**
- Teacher không cho phép xem
- **UI**: Hiển thị "Giảng viên không cho phép xem lại bài làm"

**Case 3: Session ended, chưa qua reviewDelayMinutes**
- Teacher cho phép xem nhưng chưa đến thời gian
- **UI**: Hiển thị countdown "Kết quả sẽ hiển thị sau: X phút"

**Case 4: Session ended, qua reviewDelayMinutes, nhưng attempt chưa submit**
- Student chưa submit (có thể do timeout, lỗi, etc.)
- **UI**: Không hiển thị review mode (vì không có đáp án để so sánh)

### 2. **Security Considerations - CRITICAL**

#### 2.1 **Server-Side Time Validation (MUST)**

**⚠️ QUAN TRỌNG: Tất cả timing checks PHẢI ở server-side để tránh student hack thời gian.**

**Current Implementation (✅ GOOD):**
- ✅ `/api/attempts/[attemptId]/state` - Tính `now = new Date()` ở server
- ✅ `/api/attempts/[attemptId]/submit` - Gọi `validateAttemptTimeLimit()` server-side
- ✅ `/api/attempts/[attemptId]/answers` - Validate time limit server-side trước khi lưu
- ✅ `/server/attemptTimeLimit.ts` - Tất cả logic tính toán thời gian đều server-side

**Review Timing Check (MUST be server-side):**
```typescript
// ✅ CORRECT: Server-side check
export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  // ... auth checks ...
  
  const attempt = await prisma.attempt.findUnique({ ... });
  const session = attempt.quizSession;
  
  // ✅ Server-side time check
  const now = new Date(); // Server time, không thể hack
  const settings = session.settings as { allowReview?: boolean; bufferMinutes?: number } | null;
  
  const canReview = 
    attempt.status === 'submitted' &&
    session.status === 'ended' &&
    session.endedAt !== null &&
    settings?.allowReview === true &&
    (() => {
      const bufferMinutes = settings.bufferMinutes ?? 5;
      const reviewAvailableAt = new Date(
        session.endedAt.getTime() + bufferMinutes * 60 * 1000
      );
      return now >= reviewAvailableAt; // ✅ Server-side comparison
    })();
  
  // Chỉ trả về isCorrect nếu canReview === true
  // ...
}
```

**❌ WRONG - Client-side check (KHÔNG BAO GIỜ làm):**
```typescript
// ❌ KHÔNG BAO GIỜ làm thế này
const now = new Date(); // Client time - có thể bị hack!
if (now >= reviewAvailableAt) {
  // Show answers - DANGEROUS!
}
```

#### 2.2 **Client-Side Countdown (UI Only)**

**Client-side countdown timer CHỈ dùng để hiển thị UI, KHÔNG dùng để validate:**

```typescript
// ✅ OK: Client-side countdown chỉ để hiển thị
useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date(); // Client time - chỉ để hiển thị
    const remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    setTimeRemaining(remaining); // Chỉ để hiển thị UI
  }, 1000);
  return () => clearInterval(interval);
}, [endTime]);

// ✅ Server vẫn validate mỗi API call
// Student có thể hack countdown timer, nhưng server vẫn reject nếu hết thời gian
```

**Security Rule:**
- ✅ Client-side timer: Chỉ để UX (hiển thị countdown)
- ✅ Server-side validation: Bắt buộc cho mọi API call
- ❌ KHÔNG BAO GIỜ trust client time cho business logic

#### 2.3 **Other Security Measures**

- ✅ Chỉ student sở hữu attempt mới được xem (`requireAttemptAccess`)
- ✅ Chỉ hiển thị đáp án khi `allowReview = true` (teacher control)
- ✅ Chỉ hiển thị sau buffer time (tránh leak đáp án sớm)
- ✅ Server-side validation cho mọi timing check
- ✅ Không trả về `isCorrect` nếu không đủ điều kiện

### 3. **Performance Considerations - Caching Question Scores**

#### 3.1 **Vấn đề**

Tính toán điểm từng câu (`questionScore`) có thể tốn thời gian với nhiều câu hỏi, đặc biệt với:
- Partial credit scoring (EDC, By Halves)
- Penalty scoring
- Nhiều câu hỏi (50+ questions)

**Hiện tại:**
- Khi submit, chỉ tính và lưu `attempt.score` (tổng điểm)
- Không lưu điểm từng câu
- Khi review, phải tính lại điểm từng câu → tốn thời gian

#### 3.2 **Giải pháp: Cache trong Database**

**Option A: Lưu vào JSONB field trong Attempt (Recommended cho MVP)**

```typescript
// Thêm field mới vào Attempt model
model Attempt {
  // ... existing fields
  score Float?
  questionScores Json? // NEW: Cache điểm từng câu { questionId: score }
}
```

**Khi submit:**
```typescript
// Trong /api/attempts/[attemptId]/submit/route.ts
const questionScores: Record<string, number> = {};

for (const q of snapshots) {
  // ... tính điểm cho từng câu ...
  questionScores[q.id] = qScore;
  score += qScore;
}

await prisma.attempt.update({
  where: { id: attemptId },
  data: {
    status: 'submitted',
    submittedAt: new Date(),
    score: roundScore(score, rounding),
    questionScores, // ✅ Cache điểm từng câu
  },
});
```

**Khi review:**
```typescript
// Trong /api/attempts/[attemptId]/questions/route.ts
const attempt = await prisma.attempt.findUnique({
  where: { id: attemptId },
  select: {
    questionScores: true, // ✅ Lấy từ cache
    // ...
  },
});

const questionScoresMap = attempt.questionScores as Record<string, number> | null;
// Không cần tính lại, chỉ cần lấy từ cache
```

**Pros:**
- ✅ Đơn giản, không cần thêm infrastructure (Redis)
- ✅ Dữ liệu persistent, không mất khi server restart
- ✅ Dễ query và debug
- ✅ Phù hợp cho MVP

**Cons:**
- ⚠️ JSONB field có thể lớn với nhiều câu hỏi (nhưng thường < 1KB)
- ⚠️ Không có TTL (nhưng không cần, vì điểm không thay đổi sau khi submit)

**Option B: Redis Cache (Future Enhancement)**

Chỉ nên dùng nếu:
- Có nhiều requests review cùng lúc (high traffic)
- Cần TTL và auto-expire
- Cần distributed cache (multiple servers)

**Khuyến nghị: Dùng Option A (Database JSONB) cho MVP**

#### 3.3 **Migration Plan**

```sql
-- Migration: Add questionScores field
ALTER TABLE "Attempt" 
ADD COLUMN "questionScores" JSONB;
```

**Backward compatibility:**
- Nếu `questionScores` là `null`, tính toán on-demand (fallback)
- Sau khi submit, luôn lưu `questionScores`

### 4. **UX Considerations**

- **Countdown timer**: Hiển thị thời gian còn lại đến khi có thể xem
- **Notification**: Có thể gửi notification khi review available (future enhancement)
- **Auto-refresh**: Tự động refresh khi đến thời điểm có thể xem

---

## 📚 Related Files

- `/api/attempts/[attemptId]/questions/route.ts` - Cần cập nhật
- `/api/attempts/[attemptId]/submit/route.ts` - Reference cho scoring logic
- `/app/[locale]/(auth)/attempt/[attemptId]/studentAttempt.tsx` - Cần cập nhật UI
- `/app/[locale]/(auth)/dashboard/sessions/SessionsPanel.tsx` - Cần thêm link review
- `/app/[locale]/(auth)/dashboard/classes/[classId]/shared/SessionsList.tsx` - Cần thêm link review

---

## 💡 Future Enhancements

1. **Explanation**: Teacher có thể thêm giải thích cho từng câu hỏi, hiển thị trong review mode
2. **Comparison**: So sánh với lần làm trước (nếu có)
3. **Review history**: Lưu lại lịch sử xem lại (khi nào xem, xem bao lâu)
4. **Redis cache**: Nếu cần high-performance caching (chỉ khi có high traffic)
