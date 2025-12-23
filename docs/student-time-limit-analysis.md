# Phân tích cơ chế Time Limit cho Student Attempts

## Yêu cầu

1. **Student có thể join muộn**: Vào sau khi session đã start
2. **Mỗi student chỉ làm bài trong `durationSeconds`**: Từ lúc bắt đầu làm bài
3. **Phải kết thúc trước buffer time**: Trước khi `session.startedAt + durationSeconds + bufferMinutes`
4. **Không được làm quá thời gian cho phép**: Strict enforcement

## Phân tích hiện trạng

### Database Schema hiện tại:

**Attempt model:**
- `createdAt`: Thời điểm tạo attempt (khi student join session)
- `submittedAt`: Thời điểm submit
- **Thiếu**: Field để track thời điểm student thực sự bắt đầu làm bài

**QuizSession model:**
- `startedAt`: Thời điểm session bắt đầu
- `endedAt`: Thời điểm session kết thúc
- `settings.durationSeconds`: Thời gian làm bài (giây)
- `settings.bufferMinutes`: Buffer time trước khi auto-end (phút)

### Vấn đề:

1. **Không có `attemptStartedAt`**: Không biết student bắt đầu làm bài lúc nào
2. **Không có time limit enforcement**: Client và server chưa check thời gian
3. **Không có auto-submit khi hết thời gian**: Student có thể làm quá giờ

---

## Giải pháp đề xuất

### 1. **Database Changes**

#### Option A: Thêm `attemptStartedAt` vào Attempt model (Recommended)

```prisma
model Attempt {
  // ... existing fields
  attemptStartedAt DateTime?  // Thời điểm student thực sự bắt đầu làm bài
  // Nếu NULL: chưa bắt đầu làm bài (chỉ mới join)
  // Nếu có giá trị: thời điểm bắt đầu làm bài
}
```

**Logic:**
- Khi student join session: `attemptStartedAt = NULL`
- Khi student load attempt page lần đầu (hoặc click "Bắt đầu làm bài"): `attemptStartedAt = now()`
- Tính `attemptEndTime = attemptStartedAt + durationSeconds`

#### Option B: Dùng `createdAt` làm `attemptStartedAt` (Simpler)

**Logic:**
- Khi student join = bắt đầu làm bài ngay
- `attemptEndTime = attempt.createdAt + durationSeconds`
- **Nhược điểm**: Không phân biệt được join và start

**Khuyến nghị: Option A** - Linh hoạt hơn, cho phép student join trước nhưng chưa bắt đầu làm bài.

---

### 2. **Time Calculation Logic**

```typescript
// Server-side calculation
function calculateAttemptEndTime(
  attempt: Attempt,
  session: QuizSession
): Date {
  const settings = session.settings as {
    durationSeconds?: number;
    bufferMinutes?: number;
  } | null;
  
  const durationSeconds = settings?.durationSeconds;
  if (!durationSeconds || !attempt.attemptStartedAt) {
    // Chưa bắt đầu hoặc không có time limit
    return new Date(Date.now() + 86400 * 1000); // Far future
  }
  
  // Thời gian kết thúc của attempt (từ lúc bắt đầu làm bài)
  const attemptEndTime = new Date(
    attempt.attemptStartedAt.getTime() + durationSeconds * 1000
  );
  
  // Thời gian kết thúc của session (bao gồm buffer)
  const bufferMinutes = settings?.bufferMinutes ?? 5;
  const sessionEndTime = new Date(
    session.startedAt.getTime() + durationSeconds * 1000 + bufferMinutes * 60 * 1000
  );
  
  // Lấy thời gian sớm hơn (strict enforcement)
  return attemptEndTime < sessionEndTime ? attemptEndTime : sessionEndTime;
}
```

**Rules:**
1. `attemptEndTime = attemptStartedAt + durationSeconds`
2. `sessionEndTime = session.startedAt + durationSeconds + bufferMinutes`
3. `actualEndTime = min(attemptEndTime, sessionEndTime)`
4. Student phải submit trước `actualEndTime`

---

### 3. **Client-side Enforcement**

#### A. Countdown Timer

```typescript
// Trong studentAttempt.tsx
const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
const [isTimeUp, setIsTimeUp] = useState(false);

useEffect(() => {
  if (!state?.attemptStartedAt || !session?.durationSeconds) {
    return;
  }
  
  const endTime = new Date(
    new Date(state.attemptStartedAt).getTime() + session.durationSeconds * 1000
  );
  
  const interval = setInterval(() => {
    const now = new Date();
    const remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    
    setTimeRemaining(remaining);
    
    if (remaining === 0) {
      setIsTimeUp(true);
      // Auto-submit
      void submit();
    }
  }, 1000);
  
  return () => clearInterval(interval);
}, [state?.attemptStartedAt, session?.durationSeconds]);
```

#### B. Disable Input khi hết thời gian

```typescript
// Disable tất cả input khi hết thời gian
const isDisabled = isTimeUp || state?.status === 'submitted';
```

#### C. Warning khi sắp hết thời gian

```typescript
// Warning khi còn < 5 phút
const showWarning = timeRemaining !== null && timeRemaining < 300;
```

---

### 4. **Server-side Enforcement**

#### A. Validate trên mỗi API call

```typescript
// Trong /api/attempts/[attemptId]/answers/route.ts
async function validateTimeLimit(attemptId: string): Promise<boolean> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      quizSession: {
        select: {
          startedAt: true,
          settings: true,
        },
      },
    },
  });
  
  if (!attempt || !attempt.attemptStartedAt) {
    return true; // Chưa bắt đầu, cho phép
  }
  
  const endTime = calculateAttemptEndTime(attempt, attempt.quizSession);
  const now = new Date();
  
  if (now > endTime) {
    // Hết thời gian, auto-submit nếu chưa submit
    if (attempt.status === 'active') {
      await autoSubmitAttempt(attemptId);
    }
    return false;
  }
  
  return true;
}
```

#### B. Auto-submit khi hết thời gian

```typescript
async function autoSubmitAttempt(attemptId: string) {
  // Submit attempt với tất cả answers hiện tại
  // Logic tương tự như manual submit
  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
    },
  });
  
  // Calculate score...
}
```

#### C. Check trong `/api/attempts/[attemptId]/state`

```typescript
// Trả về thông tin time limit cho client
return NextResponse.json({
  ...attempt,
  attemptStartedAt: attempt.attemptStartedAt,
  attemptEndTime: calculateAttemptEndTime(attempt, session),
  timeRemaining: Math.max(0, endTime.getTime() - now.getTime()),
  isTimeUp: now > endTime,
});
```

---

### 5. **API Changes**

#### A. `/api/attempts/[attemptId]/start` (NEW)

```typescript
// Endpoint để student bắt đầu làm bài
export async function POST(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { userId } = await requireUser();
  const { attemptId } = await ctx.params;
  
  // Check ownership
  await requireAttemptAccess(userId, attemptId);
  
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { quizSession: true },
  });
  
  if (!attempt || attempt.status !== 'active') {
    return NextResponse.json({ error: 'INVALID_ATTEMPT' }, { status: 400 });
  }
  
  if (attempt.attemptStartedAt) {
    // Đã bắt đầu rồi
    return NextResponse.json({ ok: true, attemptStartedAt: attempt.attemptStartedAt });
  }
  
  // Set attemptStartedAt
  const now = new Date();
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { attemptStartedAt: now },
  });
  
  return NextResponse.json({ ok: true, attemptStartedAt: now });
}
```

#### B. Update `/api/attempts/[attemptId]/state`

```typescript
// Thêm thông tin time limit
const attemptEndTime = calculateAttemptEndTime(attempt, session);
const timeRemaining = Math.max(0, attemptEndTime.getTime() - now.getTime());

return NextResponse.json({
  ...attempt,
  attemptStartedAt: attempt.attemptStartedAt,
  attemptEndTime: attemptEndTime.toISOString(),
  timeRemaining: Math.floor(timeRemaining / 1000), // seconds
  isTimeUp: now > attemptEndTime,
});
```

#### C. Update `/api/attempts/[attemptId]/answers` (POST)

```typescript
// Validate time limit trước khi save
const isValid = await validateTimeLimit(attemptId);
if (!isValid) {
  return NextResponse.json({ error: 'TIME_LIMIT_EXCEEDED' }, { status: 400 });
}
```

---

### 6. **UI/UX Flow**

#### A. Join Session Flow

1. Student join session → `attempt` được tạo, `attemptStartedAt = NULL`
2. Redirect đến attempt page
3. Show "Bắt đầu làm bài" button (nếu `attemptStartedAt === NULL`)
4. Click button → Call `/api/attempts/[attemptId]/start`
5. Set `attemptStartedAt = now()`
6. Show questions và countdown timer

#### B. Attempt Page Flow

1. Load attempt page
2. Check `attemptStartedAt`:
   - Nếu `NULL`: Show "Bắt đầu làm bài" button
   - Nếu có giá trị: Show questions + countdown timer
3. Countdown timer:
   - Hiển thị thời gian còn lại
   - Warning khi < 5 phút (màu vàng)
   - Warning khi < 1 phút (màu đỏ)
   - Auto-submit khi = 0
4. Disable input khi hết thời gian

#### C. Time Limit Display

```tsx
// Status bar component
{timeRemaining !== null && (
  <div className={cn(
    "text-sm font-medium",
    timeRemaining < 60 && "text-red-500",
    timeRemaining < 300 && timeRemaining >= 60 && "text-yellow-500"
  )}>
    {timeRemaining < 60 
      ? `Còn lại: ${timeRemaining}s` 
      : `Còn lại: ${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
    }
  </div>
)}
```

---

## Implementation Plan

### Phase 1: Database & API
1. ✅ Add `attemptStartedAt DateTime?` to Attempt model
2. ✅ Create migration
3. ✅ Add `/api/attempts/[attemptId]/start` endpoint
4. ✅ Update `/api/attempts/[attemptId]/state` to return time limit info
5. ✅ Add `validateTimeLimit()` helper
6. ✅ Add `calculateAttemptEndTime()` helper
7. ✅ Update `/api/attempts/[attemptId]/answers` to validate time limit

### Phase 2: Client-side
1. ✅ Add countdown timer component
2. ✅ Add "Bắt đầu làm bài" button flow
3. ✅ Add time limit validation
4. ✅ Add auto-submit when time up
5. ✅ Add warning states (yellow/red)
6. ✅ Disable input when time up

### Phase 3: Testing
1. ✅ Test join muộn scenario
2. ✅ Test time limit enforcement
3. ✅ Test auto-submit
4. ✅ Test edge cases (buffer time, session end)

---

## Edge Cases

### 1. Student join sau khi session đã start

**Scenario:**
- Session start: 10:00
- Duration: 30 phút
- Buffer: 5 phút
- Student join: 10:15

**Expected:**
- `attemptStartedAt = 10:15`
- `attemptEndTime = 10:45` (10:15 + 30 phút)
- `sessionEndTime = 10:35` (10:00 + 30 phút + 5 phút)
- `actualEndTime = 10:35` (min của 2 thời gian)
- Student chỉ có 20 phút làm bài

### 2. Student join trước khi session start

**Scenario:**
- Session scheduled: 10:00
- Student join: 9:55 (lobby)

**Expected:**
- `attemptStartedAt = NULL` (chưa bắt đầu)
- Khi session auto-start → student có thể bắt đầu làm bài
- `attemptStartedAt` được set khi student click "Bắt đầu làm bài"

### 3. Session auto-end trước khi student hết thời gian

**Scenario:**
- Session start: 10:00
- Duration: 30 phút
- Buffer: 5 phút
- Student start: 10:20
- Session auto-end: 10:35

**Expected:**
- `attemptEndTime = 10:50` (10:20 + 30 phút)
- `sessionEndTime = 10:35`
- `actualEndTime = 10:35`
- Student bị force submit lúc 10:35

---

## Security Considerations

1. **Server-side validation là bắt buộc**: Client-side chỉ là UX, không thể trust
2. **Check trên mỗi API call**: Không chỉ check một lần
3. **Auto-submit khi hết thời gian**: Đảm bảo không có answers nào được save sau deadline
4. **Time synchronization**: Dùng server time, không dùng client time

---

## Questions to Consider

1. **Khi nào set `attemptStartedAt`?**
   - Option A: Khi student load attempt page lần đầu
   - Option B: Khi student click "Bắt đầu làm bài" button
   - **Khuyến nghị: Option B** - Cho phép student xem trước, chuẩn bị

2. **Có cho phép student xem questions trước khi bắt đầu không?**
   - **Khuyến nghị: Có** - Student có thể xem questions nhưng không thể submit answer cho đến khi click "Bắt đầu làm bài"

3. **Có cho phép student pause/resume không?**
   - **Khuyến nghị: Không** - Time limit là strict, không pause

4. **Có cho phép student submit sớm không?**
   - **Khuyến nghị: Có** - Student có thể submit bất cứ lúc nào trước khi hết thời gian

---

## Summary

**Core Logic:**
- `attemptStartedAt`: Thời điểm student bắt đầu làm bài
- `attemptEndTime = attemptStartedAt + durationSeconds`
- `sessionEndTime = session.startedAt + durationSeconds + bufferMinutes`
- `actualEndTime = min(attemptEndTime, sessionEndTime)`
- **Enforcement**: Client countdown + Server validation + Auto-submit

**Key Features:**
- ✅ Student có thể join muộn
- ✅ Mỗi student chỉ làm bài trong `durationSeconds`
- ✅ Phải kết thúc trước buffer time
- ✅ Strict enforcement (client + server)
- ✅ Auto-submit khi hết thời gian
