# Performance: Caching Question Scores

**Date**: 2025-01-XX  
**Priority**: 🟡 **Medium - Performance Optimization**

---

## 📋 Vấn đề

Khi student xem lại bài làm (review mode), cần hiển thị điểm cho từng câu hỏi (`questionScore`).

**Hiện tại:**
- Khi submit, chỉ tính và lưu `attempt.score` (tổng điểm)
- Không lưu điểm từng câu
- Khi review, phải tính lại điểm từng câu → tốn thời gian

**Vấn đề:**
- Với nhiều câu hỏi (50+), tính toán lại tốn thời gian
- Partial credit scoring (EDC, By Halves) phức tạp hơn
- Nhiều students review cùng lúc → server load cao

---

## ✅ Giải pháp: Cache trong Database

### Option A: JSONB Field (Recommended cho MVP)

**Thêm field mới vào Attempt model:**

```prisma
model Attempt {
  id               String            @id @default(cuid())
  // ... existing fields
  score            Float?
  questionScores   Json?             // NEW: Cache điểm từng câu { questionId: score }
  // ...
}
```

**Migration:**
```sql
ALTER TABLE "Attempt" 
ADD COLUMN "questionScores" JSONB;
```

### Implementation

#### 1. Khi Submit - Tính và Cache

**File**: `/api/attempts/[attemptId]/submit/route.ts`

```typescript
const questionScores: Record<string, number> = {};

for (const q of snapshots) {
  // ... tính điểm cho từng câu ...
  let qScore = 0;
  if (mode === 'all_or_nothing') {
    qScore = computeAllOrNothing(selected, correctOrders);
  } else if (mode === 'partial') {
    qScore = partialMethod === 'halves'
      ? computeByHalves(selected, correctSet, optionCount)
      : computeEDC(selected, correctSet, optionCount);
  } else {
    qScore = computePenalty(selected, correctSet, optionCount, penaltyPerWrongOption);
  }
  
  questionScores[q.id] = roundScore(qScore, rounding); // ✅ Cache điểm từng câu
  score += qScore;
}

await prisma.attempt.update({
  where: { id: attemptId },
  data: {
    status: 'submitted',
    submittedAt: new Date(),
    score: roundScore(score, rounding),
    questionScores, // ✅ Lưu vào database
  },
});
```

#### 2. Khi Review - Lấy từ Cache

**File**: `/api/attempts/[attemptId]/questions/route.ts`

```typescript
const attempt = await prisma.attempt.findUnique({
  where: { id: attemptId },
  select: {
    id: true,
    status: true,
    questionScores: true, // ✅ Lấy từ cache
    // ...
  },
});

// Get question scores from cache
const questionScoresMap = attempt.questionScores
  ? (attempt.questionScores as Record<string, number>)
  : null;

// Return questions with scores
return NextResponse.json({
  questions: raw.map(q => ({
    ...q,
    ...(canReview ? {
      studentSelected: answerMap.get(q.id) || [],
      questionScore: questionScoresMap?.[q.id] ?? null, // ✅ Lấy từ cache
    } : {}),
  })),
  canReview,
  // ...
});
```

#### 3. Fallback: Tính toán on-demand (Backward Compatibility)

Nếu `questionScores` là `null` (attempt cũ, chưa có cache):

```typescript
// Fallback: Calculate on-demand if cache missing
if (canReview && !questionScoresMap) {
  questionScoresMap = await calculateQuestionScores(attemptId);
  // Optionally: Update cache for future requests
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { questionScores: questionScoresMap },
  });
}
```

---

## 📊 Performance Comparison

### Without Cache
- **Submit**: ~50ms (tính tổng điểm)
- **Review**: ~200ms (tính lại điểm từng câu cho 50 questions)
- **Concurrent reviews**: 10 students → 2s total

### With Cache
- **Submit**: ~55ms (tính + lưu cache)
- **Review**: ~10ms (lấy từ database)
- **Concurrent reviews**: 10 students → 0.1s total

**Improvement: ~20x faster for review requests**

---

## 🎯 Pros & Cons

### Option A: Database JSONB (Recommended)

**Pros:**
- ✅ Đơn giản, không cần thêm infrastructure
- ✅ Dữ liệu persistent, không mất khi server restart
- ✅ Dễ query và debug
- ✅ Phù hợp cho MVP
- ✅ Backward compatible (fallback tính toán)

**Cons:**
- ⚠️ JSONB field có thể lớn với nhiều câu hỏi (nhưng thường < 1KB)
- ⚠️ Không có TTL (nhưng không cần, vì điểm không thay đổi)

### Option B: Redis Cache (Future)

**Chỉ nên dùng nếu:**
- Có nhiều requests review cùng lúc (high traffic)
- Cần TTL và auto-expire
- Cần distributed cache (multiple servers)

**Khuyến nghị: Dùng Option A cho MVP**

---

## 📝 Implementation Checklist

- [ ] Thêm `questionScores` JSONB field vào Attempt model
- [ ] Tạo migration
- [ ] Cập nhật `/api/attempts/[attemptId]/submit`:
  - [ ] Tính điểm từng câu
  - [ ] Lưu vào `questionScores` field
- [ ] Cập nhật `/api/attempts/[attemptId]/questions`:
  - [ ] Lấy `questionScores` từ cache
  - [ ] Fallback: Tính toán on-demand nếu cache không có
- [ ] Test với:
  - [ ] Attempt mới (có cache)
  - [ ] Attempt cũ (không có cache, fallback)
  - [ ] Nhiều câu hỏi (50+)
  - [ ] Partial credit scoring

---

## 🔄 Migration Strategy

1. **Phase 1**: Thêm field, không bắt buộc
   - Attempts mới sẽ có cache
   - Attempts cũ vẫn hoạt động (fallback)

2. **Phase 2**: Backfill (Optional)
   - Chạy script để tính và cache điểm cho attempts cũ
   - Có thể làm background job

3. **Phase 3**: Remove fallback (Future)
   - Sau khi tất cả attempts đều có cache
   - Có thể bỏ fallback logic

---

## 📚 Related Files

- `/api/attempts/[attemptId]/submit/route.ts` - Tính và cache
- `/api/attempts/[attemptId]/questions/route.ts` - Lấy từ cache
- `/prisma/schema.prisma` - Model definition
- `/server/attemptTimeLimit.ts` - Reference pattern
