# 🧪 Test Build Giống Vercel

Hướng dẫn test build ở local để đảm bảo build thành công trên Vercel.

## 🔍 Tại sao Local Build được mà Vercel không?

### Khác biệt chính:

1. **Node.js Version**
   - Local: Có thể dùng Node 20, 22, hoặc 24
   - Vercel: Tự động dùng Node 24.12.0 (theo `engines.node >= 20`)

2. **Clean Build**
   - Local: Có thể có cache từ lần build trước
   - Vercel: Luôn clean build (không có cache)

3. **TypeScript Strict Mode**
   - Local: Có thể bỏ qua một số lỗi nhỏ
   - Vercel: Strict type checking, không bỏ qua lỗi

4. **Environment Variables**
   - Local: Có thể thiếu một số biến nhưng vẫn build được
   - Vercel: Cần đầy đủ biến để build

5. **Dependencies**
   - Local: Có thể có `node_modules` từ lần install trước
   - Vercel: Luôn `npm ci` (clean install)

---

## ✅ Cách Test Build Giống Vercel

### Option 1: Dùng Script (Recommended)

```bash
cd bkquiz-web
npm run test:build
```

Script này sẽ:
1. Check TypeScript types
2. Generate Prisma Client
3. Build Next.js

### Option 2: Clean Build Manual

```bash
cd bkquiz-web

# 1. Clean everything
rm -rf .next node_modules/.cache .turbo

# 2. Fresh install (giống Vercel)
npm ci

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Check TypeScript (quan trọng!)
npm run check:types

# 5. Build (giống Vercel)
NODE_ENV=production npm run build:next
```

### Option 3: Dùng Shell Script

```bash
cd bkquiz-web
./scripts/test-build-vercel.sh
```

---

## 🔧 Các Lệnh Quan Trọng

### 1. TypeScript Check (Quan trọng nhất!)

```bash
npm run check:types
```

**Lý do:** Vercel sẽ fail build nếu có TypeScript errors, ngay cả khi local dev server chạy được.

### 2. Clean Build

```bash
# Clean cache
rm -rf .next node_modules/.cache .turbo

# Fresh install
npm ci

# Build
npm run build
```

### 3. Test với Node Version giống Vercel

```bash
# Dùng nvm để switch Node version
nvm use 24

# Hoặc dùng Docker
docker run -it --rm -v $(pwd):/app -w /app node:24 npm ci && npm run build
```

---

## 🐛 Common Issues

### Issue 1: "Type error" ở Vercel nhưng local OK

**Nguyên nhân:** Local có cache hoặc TypeScript config khác.

**Fix:**
```bash
# Clean và check types
rm -rf .next
npm run check:types
```

### Issue 2: "Module not found" ở Vercel

**Nguyên nhân:** Dependencies không sync hoặc có file không được commit.

**Fix:**
```bash
# Fresh install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue 3: "Prisma Client not generated"

**Nguyên nhân:** Quên generate Prisma Client.

**Fix:**
```bash
npm run prisma:generate
npm run build
```

---

## 📋 Pre-Commit Checklist

Trước khi commit, chạy:

```bash
# 1. Type check
npm run check:types

# 2. Lint
npm run lint

# 3. Build test
npm run test:build
```

Nếu tất cả pass → Build sẽ thành công trên Vercel ✅

---

## 🚀 CI/CD Integration

Project đã có GitHub Actions CI để test build:

```yaml
# .github/workflows/CI.yml
- name: Build Next.js
  run: npm run build-local
```

Nếu CI pass → Vercel build sẽ pass ✅

---

## 💡 Tips

1. **Luôn chạy `npm run check:types` trước khi commit**
2. **Clean build thường xuyên** để phát hiện lỗi sớm
3. **Test với Node 24** nếu có thể (giống Vercel)
4. **Check Vercel build logs** nếu local pass nhưng Vercel fail

---

Made with ❤️ for education

