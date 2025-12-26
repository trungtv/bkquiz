# 📊 Phân tích Quota Vercel Hobby Free cho BKquiz

Phân tích chi tiết về khả năng hết quota khi deploy bkquiz-web lên Vercel Hobby (free tier).

**Tham khảo:** [Vercel Limits Documentation](https://vercel.com/docs/limits)

---

## 🎯 Tổng quan

Vercel Hobby (free) có các giới hạn sau:

| Giới hạn | Hobby Free | Nguy cơ cho BKquiz |
|----------|------------|-------------------|
| **Function Execution Time** | 10 giây | ⚠️ **CAO** |
| **Bandwidth** | 100 GB/tháng | 🟡 **TRUNG BÌNH** |
| **Builds per hour** | 100 builds | ✅ **THẤP** |
| **Build time** | 45 phút max | ✅ **THẤP** |
| **Environment Variables** | 64 KB total | ✅ **THẤP** |
| **Files per deployment** | 20,000 files | ✅ **THẤP** |
| **Proxied request timeout** | 120 giây | ✅ **THẤP** |

---

## ⚠️ Nguy cơ cao: Function Execution Time (10 giây)

### Vấn đề

Vercel Hobby chỉ cho phép **10 giây** cho mỗi function execution. Nếu function chạy quá 10 giây, request sẽ bị timeout.

### Các API routes có nguy cơ timeout:

#### 1. **Import Questions** (`/api/pools/import`) - ⚠️ **NGUY CƠ CAO**

**Code location:** `src/app/api/pools/import/route.ts`

**Vấn đề:**
- Import file ZIP/Markdown với nhiều questions
- Vòng lặp tạo từng question trong database (sequential)
- Với 100+ questions, có thể mất >10 giây

**Ví dụ:**
```typescript
// Line 110-149: Sequential database operations
for (const q of parsed.questions) {
  const question = await prisma.question.create({...}); // ~50-100ms mỗi question
  // + tạo options
  // + tạo tags
  // + upsert tags
}
```

**Tính toán:**
- 1 question = ~100-200ms (create + options + tags)
- 50 questions = ~5-10 giây ⚠️
- 100 questions = ~10-20 giây ❌ **TIMEOUT**

**Giải pháp:**
1. ✅ **Batch operations** - Tạo nhiều questions cùng lúc
2. ✅ **Background job** - Dùng queue (Vercel Pro có Cron Jobs)
3. ✅ **Progress API** - Chia nhỏ import thành nhiều requests
4. ✅ **Upgrade to Pro** - Tăng lên 60 giây

#### 2. **Submit Attempt** (`/api/attempts/[attemptId]/submit`) - 🟡 **TRUNG BÌNH**

**Code location:** `src/app/api/attempts/[attemptId]/submit/route.ts`

**Vấn đề:**
- Tính điểm cho từng câu hỏi (vòng lặp)
- Với 100+ questions, có thể mất 2-5 giây

**Tính toán:**
- 1 question scoring = ~20-50ms
- 50 questions = ~1-2.5 giây ✅
- 100 questions = ~2-5 giây ✅
- 200 questions = ~4-10 giây ⚠️

**Giải pháp:**
- ✅ Đã có caching (`questionScores` JSONB field)
- ✅ Code đã tối ưu (không có vấn đề lớn)

#### 3. **Export Pool** (`/api/pools/[poolId]/export`) - 🟡 **TRUNG BÌNH**

**Vấn đề:**
- Export nhiều questions thành Markdown/ZIP
- Với 100+ questions, có thể mất 3-8 giây

**Giải pháp:**
- ✅ Streaming response nếu có thể
- ✅ Pagination nếu cần

---

## 🟡 Nguy cơ trung bình: Bandwidth (100 GB/tháng)

### Tính toán

**Giả định:**
- 1 page load = ~500 KB (HTML + JS + CSS + images)
- 1 API request = ~10-50 KB
- 1 image upload = ~100-500 KB

**Scenarios:**

#### Scenario 1: Small scale (100 users/tháng)
- Page views: 10,000 views × 500 KB = 5 GB
- API calls: 50,000 calls × 20 KB = 1 GB
- Image uploads: 100 uploads × 300 KB = 30 MB
- **Total: ~6 GB** ✅ **AN TOÀN**

#### Scenario 2: Medium scale (1,000 users/tháng)
- Page views: 100,000 views × 500 KB = 50 GB
- API calls: 500,000 calls × 20 KB = 10 GB
- Image uploads: 1,000 uploads × 300 KB = 300 MB
- **Total: ~60 GB** ✅ **AN TOÀN**

#### Scenario 3: Large scale (5,000 users/tháng)
- Page views: 500,000 views × 500 KB = 250 GB ❌
- API calls: 2,500,000 calls × 20 KB = 50 GB
- Image uploads: 5,000 uploads × 300 KB = 1.5 GB
- **Total: ~300 GB** ❌ **VƯỢT QUÁ**

### Giải pháp

1. ✅ **CDN caching** - Vercel tự động cache static assets
2. ✅ **Image optimization** - Next.js Image component
3. ✅ **Code splitting** - Giảm bundle size
4. ✅ **External storage** - Lưu images trên Supabase Storage (không tính vào Vercel bandwidth)
5. ⚠️ **Upgrade to Pro** - 1 TB/tháng ($20/tháng)

---

## ✅ Nguy cơ thấp: Các giới hạn khác

### Builds per hour (100 builds)

**Nguy cơ:** ✅ **THẤP**

- Mỗi commit = 1 build
- 100 builds/hour = ~1.6 builds/phút
- Trừ khi có nhiều người commit liên tục, khó vượt quá

**Giải pháp:**
- ✅ Sử dụng preview deployments hợp lý
- ✅ Merge nhiều commits cùng lúc

### Build time (45 phút max)

**Nguy cơ:** ✅ **THẤP**

- Build time hiện tại: ~2-5 phút
- Chỉ vượt quá nếu có vấn đề với dependencies hoặc build process

**Giải pháp:**
- ✅ Optimize build process
- ✅ Cache dependencies

### Environment Variables (64 KB)

**Nguy cơ:** ✅ **THẤP**

- Hiện tại: ~2-5 KB
- Chỉ vượt quá nếu có quá nhiều secrets

**Giải pháp:**
- ✅ Sử dụng Vercel Secrets cho sensitive data
- ✅ External config nếu cần

### Files per deployment (20,000 files)

**Nguy cơ:** ✅ **THẤP**

- Hiện tại: ~500-1,000 files
- Chỉ vượt quá nếu có quá nhiều assets hoặc dependencies

**Giải pháp:**
- ✅ `.vercelignore` để exclude files không cần
- ✅ External CDN cho assets lớn

---

## 📊 Tổng kết & Khuyến nghị

### Nguy cơ theo mức độ sử dụng:

| Mức độ | Users/tháng | Function Timeout | Bandwidth | Hành động |
|--------|-------------|------------------|-----------|-----------|
| **Small** | < 500 | ✅ OK | ✅ OK | Tiếp tục Hobby |
| **Medium** | 500-2,000 | ⚠️ Cần optimize | ⚠️ Cần monitor | Optimize + Monitor |
| **Large** | > 2,000 | ❌ Cần upgrade | ❌ Cần upgrade | **Upgrade to Pro** |

### Khuyến nghị ngay lập tức:

#### 1. **Optimize Import Route** (Ưu tiên cao)

```typescript
// ❌ Hiện tại: Sequential
for (const q of parsed.questions) {
  await prisma.question.create({...});
}

// ✅ Nên: Batch operations
const questions = parsed.questions.map(q => ({
  poolId: pool.id,
  type: q.type,
  prompt: q.prompt,
  createdByTeacherId: userId,
  options: {
    create: q.options.map(o => ({...}))
  }
}));

await prisma.question.createMany({
  data: questions,
  skipDuplicates: true
});
```

#### 2. **Add maxDuration cho routes dài**

```typescript
// src/app/api/pools/import/route.ts
export const runtime = 'nodejs';
export const maxDuration = 10; // Max 10s (Hobby limit)

// Nếu cần hơn, upgrade to Pro (60s)
export const maxDuration = 60; // Pro tier
```

#### 3. **Monitor Bandwidth**

- Setup Vercel Analytics để track bandwidth usage
- Alert khi gần 80 GB/tháng
- Plan upgrade nếu cần

#### 4. **External Storage cho Images**

- ✅ Đã dùng Supabase Storage (không tính vào Vercel bandwidth)
- ✅ Tiếp tục dùng external storage cho media files

---

## 💰 Chi phí nếu upgrade

### Vercel Pro: $20/tháng

**Benefits:**
- ✅ Function execution: **60 giây** (thay vì 10s)
- ✅ Bandwidth: **1 TB/tháng** (thay vì 100 GB)
- ✅ Builds: Unlimited
- ✅ Team collaboration
- ✅ Advanced analytics

**Khi nào nên upgrade:**
- ⚠️ Function timeout thường xuyên (>1 lần/tuần)
- ⚠️ Bandwidth > 80 GB/tháng
- ⚠️ Cần team collaboration
- ⚠️ Cần advanced features

---

## 🔍 Monitoring & Alerts

### Setup monitoring:

1. **Vercel Dashboard**
   - Track function execution times
   - Monitor bandwidth usage
   - Check error rates

2. **Custom Alerts**
   - Function timeout > 5 lần/ngày
   - Bandwidth > 80 GB/tháng
   - Build failures > 10%

3. **Logs**
   - Check Vercel logs cho slow functions
   - Monitor database query times
   - Track API response times

---

## 📝 Action Items

### Ngay lập tức (Trước khi deploy):

- [ ] ✅ Optimize import route (batch operations)
- [ ] ✅ Add `maxDuration` cho routes dài
- [ ] ✅ Setup Vercel Analytics
- [ ] ✅ Test với 100+ questions import
- [ ] ✅ Monitor bandwidth trong 1 tháng đầu

### Sau 1 tháng:

- [ ] Review function execution times
- [ ] Review bandwidth usage
- [ ] Decide upgrade nếu cần
- [ ] Optimize further nếu cần

---

## 🆘 Khi hết quota

### Function Timeout:

1. **Immediate fix:**
   - Optimize code (batch operations)
   - Reduce database queries
   - Add caching

2. **Long-term:**
   - Upgrade to Pro (60s)
   - Move heavy operations to background jobs

### Bandwidth:

1. **Immediate fix:**
   - Enable aggressive caching
   - Optimize images
   - Use external CDN

2. **Long-term:**
   - Upgrade to Pro (1 TB)
   - Move static assets to external storage

---

## 📚 Tài liệu tham khảo

- [Vercel Limits](https://vercel.com/docs/limits)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Function Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#max-duration)
- [Optimizing Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

**Kết luận:** Với quy mô nhỏ-trung bình (< 2,000 users/tháng), Vercel Hobby free có thể đủ dùng nếu optimize code tốt. Với quy mô lớn hơn, nên cân nhắc upgrade to Pro.

