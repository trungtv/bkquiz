# Security: Review Timing Validation

**Date**: 2025-01-XX  
**Priority**: 🔴 **CRITICAL**

---

## ⚠️ Security Risk: Client-Side Time Manipulation

Student có thể hack client-side time để:
- Xem đáp án sớm hơn (trước khi session ended + buffer)
- Bypass timing restrictions

**Solution: TẤT CẢ timing checks PHẢI ở server-side.**

---

## ✅ Current Implementation (Good)

### Server-Side Time Validation

**File**: `/server/attemptTimeLimit.ts`
```typescript
export async function validateAttemptTimeLimit(
  attemptId: string,
): Promise<{ valid: boolean; timeRemaining: number | null; isTimeUp: boolean }> {
  // ✅ Server-side time check
  const now = new Date(); // Server time, không thể hack
  
  const attemptEndTime = calculateAttemptEndTime(attempt);
  const isTimeUp = now >= attemptEndTime; // ✅ Server-side comparison
  
  return { valid: !isTimeUp, timeRemaining, isTimeUp };
}
```

**Used in:**
- ✅ `/api/attempts/[attemptId]/submit` - Validate trước khi submit
- ✅ `/api/attempts/[attemptId]/answers` - Validate trước khi lưu answer
- ✅ `/api/attempts/[attemptId]/state` - Tính `timeRemaining` server-side

---

## 🔒 Review Timing Security (MUST Implement)

### Implementation Pattern

```typescript
// ✅ CORRECT: Server-side check
export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  // 1. Auth check
  const { userId } = await requireUser();
  await requireAttemptAccess(userId, attemptId);
  
  // 2. Fetch data
  const attempt = await prisma.attempt.findUnique({ ... });
  const session = attempt.quizSession;
  
  // 3. ✅ SERVER-SIDE TIME CHECK
  const now = new Date(); // Server time, không thể hack
  const settings = session.settings as {
    allowReview?: boolean;
    bufferMinutes?: number;
  } | null;
  
  // 4. Check all conditions server-side
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
  
  // 5. Only return isCorrect if canReview === true
  const questions = await fetchQuestions(attemptId, canReview);
  
  return NextResponse.json({
    questions,
    canReview, // Flag để frontend biết
    reviewAvailableAt: reviewAvailableAt?.toISOString() ?? null,
  });
}
```

### ❌ WRONG - Client-Side Check

```typescript
// ❌ KHÔNG BAO GIỜ làm thế này
const now = new Date(); // Client time - có thể bị hack!
if (now >= reviewAvailableAt) {
  // Show answers - DANGEROUS!
  return { isCorrect: true }; // Student có thể hack!
}
```

---

## 🛡️ Security Checklist

### Review Timing Check

- [ ] ✅ **Server-side time check**: Dùng `new Date()` ở server, không trust client
- [ ] ✅ **Server-side comparison**: `now >= reviewAvailableAt` ở server
- [ ] ✅ **No client-side validation**: Client chỉ hiển thị UI, không validate
- [ ] ✅ **Auth check**: `requireAttemptAccess` trước khi check timing
- [ ] ✅ **Multiple conditions**: Check tất cả điều kiện (submitted, ended, buffer, allowReview)
- [ ] ✅ **No early exposure**: Không trả về `isCorrect` nếu `canReview === false`

### Client-Side (UI Only)

- [ ] ✅ **Countdown timer**: Chỉ để hiển thị UX, không dùng để validate
- [ ] ✅ **Auto-refresh**: Tự động refresh khi đến thời điểm (nhưng server vẫn validate)
- [ ] ✅ **Waiting state**: Hiển thị thông báo khi chưa được phép xem

---

## 🧪 Security Testing

### Test Cases

1. **Normal flow**:
   - Session ended + buffer passed + `allowReview = true` → ✅ Can review

2. **Timing manipulation**:
   - Student hack client time → ❌ Server vẫn reject (vì dùng server time)

3. **Early access attempt**:
   - Session ended nhưng chưa qua buffer → ❌ Cannot review
   - Student hack client time → ❌ Server vẫn reject

4. **Flag manipulation**:
   - Student cố gắng set `allowReview = true` trong request → ❌ Server ignore (read from DB)

5. **Auth bypass**:
   - Student cố gắng access attempt của người khác → ❌ `requireAttemptAccess` reject

---

## 📝 Implementation Notes

### API Response Structure

```typescript
{
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{
      order: number;
      content: string;
      isCorrect?: boolean; // ✅ Chỉ có khi canReview === true
    }>;
    studentSelected?: number[]; // ✅ Chỉ có khi canReview === true
    questionScore?: number; // ✅ Chỉ có khi canReview === true
  }>;
  canReview: boolean; // ✅ Server-side flag
  reviewAvailableAt: string | null; // ✅ ISO timestamp
  attemptStatus: string;
  sessionStatus: string;
}
```

### Frontend Usage

```typescript
// ✅ Frontend chỉ hiển thị dựa trên server flag
const { questions, canReview, reviewAvailableAt } = await fetchQuestions();

if (canReview) {
  // Show review mode
  questions.forEach(q => {
    q.options.forEach(opt => {
      if (opt.isCorrect) {
        // Highlight correct answer
      }
    });
  });
} else {
  // Show waiting state
  if (reviewAvailableAt) {
    // Show countdown (UI only, server still validates)
  }
}
```

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Trust client time**: `const now = new Date()` ở client
2. ❌ **Client-side validation**: Check timing ở client trước khi gọi API
3. ❌ **Early exposure**: Trả về `isCorrect` trước khi check đủ điều kiện
4. ❌ **No auth check**: Không check user owns attempt
5. ❌ **Cache timing**: Cache `canReview` flag ở client (phải check mỗi request)

---

## ✅ Summary

**Golden Rule:**
> **NEVER trust client time for business logic. Always validate timing server-side.**

**Implementation:**
- ✅ Server-side: Tất cả timing checks
- ✅ Client-side: Chỉ UI display (countdown, waiting state)
- ✅ Auth: Check ownership trước khi check timing
- ✅ Multiple conditions: Check tất cả điều kiện (submitted, ended, buffer, allowReview)
