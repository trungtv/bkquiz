# 🔧 Troubleshooting Guide

Hướng dẫn xử lý các lỗi thường gặp khi setup và chạy BKquiz.

## 📋 Mục lục

- [Database Issues](#database-issues)
- [Build Errors](#build-errors)
- [Runtime Errors](#runtime-errors)
- [Environment Variables](#environment-variables)
- [Prisma Issues](#prisma-issues)
- [API Errors](#api-errors)
- [Performance Issues](#performance-issues)

---

## 🗄️ Database Issues

### Error: "Can't reach database server"
**Nguyên nhân**: Database không chạy hoặc connection string sai.

**Giải pháp**:
```bash
# Kiểm tra Docker services
docker compose ps

# Start services nếu chưa chạy
docker compose up -d

# Kiểm tra connection string trong .env.local
DATABASE_URL="postgresql://bkquiz:bkquiz@localhost:5433/bkquiz?schema=public"
```

### Error: "relation does not exist"
**Nguyên nhân**: Chưa chạy migrations.

**Giải pháp**:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Hoặc cho production
npx prisma migrate deploy
```

### Error: "Migration failed"
**Nguyên nhân**: Database schema không đồng bộ.

**Giải pháp**:
```bash
# Reset database (⚠️ Mất dữ liệu)
npx prisma migrate reset

# Hoặc tạo migration mới
npx prisma migrate dev --name fix-schema
```

---

## 🔨 Build Errors

### Error: "Module not found"
**Nguyên nhân**: Dependencies chưa được install hoặc cache bị lỗi.

**Giải pháp**:
```bash
# Clean và reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Error: "Type errors"
**Nguyên nhân**: TypeScript type errors.

**Giải pháp**:
```bash
# Check types
npm run check:types

# Fix types hoặc thêm @ts-expect-error nếu cần
```

### Error: "Prisma Client not generated"
**Nguyên nhân**: Prisma Client chưa được generate.

**Giải pháp**:
```bash
npm run prisma:generate
```

---

## ⚙️ Runtime Errors

### Error: "AUTH_SECRET is not set"
**Nguyên nhân**: Thiếu environment variable.

**Giải pháp**:
```bash
# Generate secret
openssl rand -base64 32

# Thêm vào .env.local
AUTH_SECRET="your-generated-secret"
```

### Error: "Invalid OAuth credentials"
**Nguyên nhân**: Google OAuth credentials sai.

**Giải pháp**:
1. Kiểm tra Google Cloud Console
2. Verify `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET`
3. Check redirect URIs trong Google Console

### Error: "S3 connection failed"
**Nguyên nhân**: S3 credentials hoặc endpoint sai.

**Giải pháp**:
```bash
# Kiểm tra S3 environment variables
S3_ENDPOINT="http://localhost:9000"  # MinIO dev
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET="bkquiz-media"

# Verify MinIO đang chạy
docker compose ps minio
```

---

## 🔐 Environment Variables

### Error: "Missing required env var"
**Nguyên nhân**: Thiếu environment variable bắt buộc.

**Giải pháp**:
1. Copy `.env.example` thành `.env.local`
2. Fill tất cả required variables
3. Restart dev server

### Required Variables Checklist
```env
✅ DATABASE_URL
✅ AUTH_SECRET
✅ AUTH_GOOGLE_ID
✅ AUTH_GOOGLE_SECRET
✅ NEXT_PUBLIC_APP_URL
✅ S3_ENDPOINT
✅ S3_REGION
✅ S3_ACCESS_KEY_ID
✅ S3_SECRET_ACCESS_KEY
✅ S3_BUCKET
```

---

## 🗃️ Prisma Issues

### Error: "Unknown field in select"
**Nguyên nhân**: Prisma Client chưa được regenerate sau schema change.

**Giải pháp**:
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Restart dev server
```

### Error: "Migration out of sync"
**Nguyên nhân**: Database schema không khớp với migrations.

**Giải pháp**:
```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Hoặc reset (⚠️ Mất dữ liệu)
npx prisma migrate reset
```

### Error: "Prisma Client validation error"
**Nguyên nhân**: Type mismatch hoặc missing required fields.

**Giải pháp**:
- Check Prisma schema
- Verify data types
- Check required fields trong model

---

## 🔌 API Errors

### Error: 401 Unauthorized
**Nguyên nhân**: Chưa đăng nhập hoặc session expired.

**Giải pháp**:
- Login lại
- Check authentication cookies
- Verify `AUTH_SECRET` đúng

### Error: 403 Forbidden
**Nguyên nhân**: Không có quyền truy cập.

**Giải pháp**:
- Check user role (teacher/student)
- Verify membership trong classroom
- Check permissions cho resource

### Error: 500 Internal Server Error
**Nguyên nhân**: Server error.

**Giải pháp**:
1. Check server logs
2. Check Sentry (nếu có)
3. Verify database connection
4. Check environment variables

---

## ⚡ Performance Issues

### Slow Database Queries
**Nguyên nhân**: Missing indexes hoặc inefficient queries.

**Giải pháp**:
```bash
# Check Prisma query logs
# Thêm vào schema.prisma:
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["queryLog"]
}

# Analyze slow queries
# Add indexes cho hot fields
```

### Slow Build Times
**Nguyên nhân**: Large bundle hoặc inefficient builds.

**Giải pháp**:
```bash
# Analyze bundle
npm run build-stats

# Check for large dependencies
npm run check:deps
```

### Memory Issues
**Nguyên nhân**: Memory leaks hoặc large datasets.

**Giải pháp**:
- Check for memory leaks trong React components
- Implement pagination cho large lists
- Use React.memo cho expensive components

---

## 🐛 Common Bugs

### Mobile Sidebar không mở
**Nguyên nhân**: JavaScript error hoặc CSS conflict.

**Giải pháp**:
1. Check browser console
2. Verify `data-sidebar-open` attribute
3. Check CSS z-index conflicts

### Student không thấy review
**Nguyên nhân**: Review window đã hết hoặc chưa đến.

**Giải pháp**:
- Check `reviewWindowMinutes` trong session settings
- Verify server-side time (không trust client)
- Check `canReview` logic trong API

### Session không có questions
**Nguyên nhân**: Chưa gọi `buildSessionSnapshotIfNeeded`.

**Giải pháp**:
- Verify session creation API gọi `buildSessionSnapshotIfNeeded`
- Check quiz rules có valid không
- Verify pools có đủ questions

---

## 📞 Getting Help

Nếu vẫn gặp vấn đề:

1. **Check Documentation**
   - [README.md](README.md)
   - [LOCAL_SETUP.md](bkquiz-web/LOCAL_SETUP.md)
   - [Architecture](docs/architecture.md)

2. **Search Issues**
   - GitHub Issues: https://github.com/trungtv/bkquiz/issues
   - Search existing issues trước khi tạo mới

3. **Create Issue**
   - Use bug report template
   - Include error logs
   - Include environment info

---

## 🔍 Debug Tips

### Enable Debug Logging
```bash
# Next.js debug
DEBUG=* npm run dev

# Prisma debug
DEBUG=prisma:* npm run dev
```

### Check Logs
```bash
# Docker logs
docker compose logs -f

# Application logs
# Check Sentry hoặc Better Stack
```

### Database Inspection
```bash
# Prisma Studio
npm run db:studio

# Direct SQL
docker compose exec postgres psql -U bkquiz -d bkquiz
```

---

## ✅ Verification Checklist

Sau khi fix issue, verify:

- [ ] Dev server starts without errors
- [ ] Database connection works
- [ ] Can login
- [ ] Can create class
- [ ] Can create quiz
- [ ] Can start session
- [ ] Student can join và làm bài
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Tests pass
