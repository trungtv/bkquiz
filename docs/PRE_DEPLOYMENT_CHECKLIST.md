# ✅ Pre-Deployment Checklist

Checklist đầy đủ trước khi deploy bkquiz-web lên Vercel + Supabase.

---

## 🚀 1. Code Optimization

### ✅ Import Route (Đã hoàn thành)
- [x] Optimize batch operations cho import questions
- [x] Thêm `maxDuration = 10` để enforce Vercel limit
- [x] Giảm database queries từ O(n²) xuống O(n)

### ⚠️ Export Route (Cần kiểm tra)
- [ ] Test export với 100+ questions
- [ ] Nếu chậm, consider streaming response
- [ ] Add `maxDuration` nếu cần

**File:** `src/app/api/pools/[poolId]/export/route.ts`

### ⚠️ Submit Route (Đã có cache)
- [x] Đã có `questionScores` caching
- [ ] Test với 200+ questions để đảm bảo < 10s

**File:** `src/app/api/attempts/[attemptId]/submit/route.ts`

### ⚠️ Other Routes
- [ ] Review các routes có loops/sequential operations
- [ ] Add `maxDuration` cho routes có thể chậm
- [ ] Test với data lớn

---

## 🔧 2. Configuration

### Environment Variables
- [ ] Tạo file `.env.example` với tất cả required variables
- [ ] Document tất cả environment variables
- [ ] Verify không có secrets hardcoded

**Required variables:**
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
NEXT_PUBLIC_APP_URL="https://..."

# Storage (Supabase)
S3_ENDPOINT="https://[project-ref].supabase.co/storage/v1/s3"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="[project-ref]"
S3_SECRET_ACCESS_KEY="[service_role_key]"
S3_BUCKET="bkquiz-media"
```

### Next.js Config
- [ ] Verify `next.config.ts` không có issues
- [ ] Check output mode (standalone nếu dùng Docker)
- [ ] Verify image optimization settings

### Prisma
- [ ] Verify `schema.prisma` đúng
- [ ] All migrations đã chạy
- [ ] Prisma Client đã generate

---

## 🗄️ 3. Database Setup (Supabase)

### Database
- [ ] Tạo Supabase project
- [ ] Lấy connection string (pooling mode)
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify database schema đúng
- [ ] Test connection từ local

### Storage
- [ ] Tạo bucket `bkquiz-media`
- [ ] Set bucket public (hoặc configure CORS)
- [ ] Lấy credentials (project-ref, service_role_key)
- [ ] Test upload/download files

### Security
- [ ] Verify connection string có SSL
- [ ] Service role key chỉ dùng server-side
- [ ] Anon key chỉ dùng client-side (nếu cần)

---

## 🚀 4. Vercel Setup

### Project Configuration
- [ ] Connect GitHub repository
- [ ] Set root directory: `bkquiz-web`
- [ ] Framework preset: Next.js
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`

### Environment Variables
- [ ] Add tất cả required variables
- [ ] Set cho Production, Preview, Development
- [ ] Verify không có typos
- [ ] Test với preview deployment

### Build Settings
- [ ] Verify Node.js version (>= 20)
- [ ] Check build logs không có errors
- [ ] Verify build time < 45 minutes

---

## 🧪 5. Testing

### Local Testing
- [ ] Test với Supabase database (không phải local)
- [ ] Test import 100+ questions
- [ ] Test export 100+ questions
- [ ] Test submit attempt với 100+ questions
- [ ] Test upload/download files

### Production Testing
- [ ] Test login/logout
- [ ] Test tạo class
- [ ] Test tạo question pool
- [ ] Test import questions
- [ ] Test tạo quiz
- [ ] Test start session
- [ ] Test student join & attempt
- [ ] Test submit & review
- [ ] Test export

### Performance Testing
- [ ] Monitor function execution times
- [ ] Check không có routes > 10s
- [ ] Monitor database query times
- [ ] Check bandwidth usage

---

## 📊 6. Monitoring Setup

### Vercel Analytics
- [ ] Enable Vercel Analytics (nếu có)
- [ ] Setup error tracking
- [ ] Monitor function execution times

### Logging
- [ ] Check Vercel logs
- [ ] Setup error alerts
- [ ] Monitor database connections

### Supabase Dashboard
- [ ] Monitor database usage
- [ ] Check storage usage
- [ ] Monitor API requests

---

## 🔒 7. Security

### Authentication
- [ ] Google OAuth redirect URIs đã update với production URL
- [ ] Test OAuth flow
- [ ] Verify session management

### Database
- [ ] Connection string có SSL
- [ ] Strong passwords
- [ ] No credentials in code

### API Security
- [ ] Rate limiting (nếu có Arcjet)
- [ ] CORS properly configured
- [ ] Input validation
- [ ] Server-side time validation

### Storage
- [ ] Bucket policies đúng
- [ ] CORS configured (nếu cần)
- [ ] Service role key không expose

---

## 📝 8. Documentation

### Deployment Docs
- [x] `DEPLOYMENT_SUPABASE.md` - Hướng dẫn Supabase
- [x] `VERCEL_QUOTA_ANALYSIS.md` - Phân tích quota
- [ ] Update `DEPLOYMENT.md` với Supabase info

### API Docs
- [ ] Document tất cả API endpoints
- [ ] Document error codes
- [ ] Document rate limits

### User Docs
- [ ] Update README với production setup
- [ ] Document environment variables
- [ ] Document troubleshooting

---

## 🐛 9. Error Handling

### Error Responses
- [ ] Tất cả routes có proper error handling
- [ ] Error messages user-friendly
- [ ] Log errors properly

### Timeout Handling
- [ ] Routes có `maxDuration` set
- [ ] Error messages cho timeout cases
- [ ] Graceful degradation

### Database Errors
- [ ] Handle connection errors
- [ ] Handle query errors
- [ ] Handle transaction errors

---

## 🔄 10. CI/CD

### GitHub Actions
- [ ] Verify CI pipeline works
- [ ] Test builds on PR
- [ ] Verify deployments

### Git Workflow
- [ ] Main branch protected
- [ ] PR reviews required
- [ ] Commit messages follow convention

---

## 📈 11. Performance Optimization

### Code
- [x] Import route optimized (batch operations)
- [ ] Export route optimized (nếu cần)
- [ ] Submit route có caching
- [ ] Database queries optimized

### Caching
- [ ] Static assets cached
- [ ] API responses cached (nếu phù hợp)
- [ ] Database query results cached (nếu cần)

### Bundle Size
- [ ] Check bundle size
- [ ] Code splitting
- [ ] Tree shaking
- [ ] Remove unused dependencies

---

## 🆘 12. Rollback Plan

### Backup
- [ ] Database backup strategy
- [ ] Code version control
- [ ] Environment variables backup

### Rollback Steps
- [ ] Document rollback procedure
- [ ] Test rollback locally
- [ ] Have rollback ready

---

## ✅ Final Checks

### Pre-Deploy
- [ ] All tests pass
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Build succeeds locally
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Storage configured

### Post-Deploy
- [ ] Production URL works
- [ ] Login works
- [ ] All features tested
- [ ] Monitoring active
- [ ] Error tracking works
- [ ] Performance acceptable

---

## 🎯 Priority Order

### Must Do (Trước khi deploy)
1. ✅ Optimize import route (DONE)
2. ⚠️ Test với Supabase database
3. ⚠️ Setup Vercel project
4. ⚠️ Set environment variables
5. ⚠️ Run migrations
6. ⚠️ Test basic flows

### Should Do (Trong tuần đầu)
1. ⚠️ Monitor performance
2. ⚠️ Setup error tracking
3. ⚠️ Test với real data
4. ⚠️ Optimize nếu cần

### Nice to Have (Sau khi stable)
1. ⚠️ Advanced monitoring
2. ⚠️ Performance optimization
3. ⚠️ Documentation updates

---

## 📚 Quick Reference

### Useful Commands

```bash
# Database migrations
npx prisma migrate deploy

# Generate Prisma Client
npm run prisma:generate

# Build locally
npm run build

# Test locally với production env
vercel env pull .env.local
npm run dev

# Deploy to Vercel
vercel --prod
```

### Important Links
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

---

**Last Updated:** 2025-01-XX
**Status:** 🟡 In Progress

