# 🐛 Fix lỗi 404 `/api/auth/providers` trong NextAuth

## Vấn đề

Khi click "Đăng nhập với Google", gặp lỗi 404 tại `/api/auth/providers`.

---

## ✅ Giải pháp

### Bước 1: Kiểm tra Route Handler

Đảm bảo file route handler tồn tại và đúng:

**File**: `bkquiz-web/src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### Bước 2: Kiểm tra Middleware

Middleware phải cho phép `/api/*` pass-through:

**File**: `bkquiz-web/middleware.ts`

```typescript
// Let API routes pass-through (avoid i18n rewrites on /api/*)
if (req.nextUrl.pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

### Bước 3: Kiểm tra Build

1. **Clean build**:
   ```bash
   cd bkquiz-web
   rm -rf .next
   npm run build
   ```

2. **Kiểm tra route có được build không**:
   - Xem trong `.next/server/app/api/auth/[...nextauth]/route.js`
   - File này phải tồn tại sau khi build

### Bước 4: Kiểm tra trên Production (Vercel)

1. Vào Vercel Dashboard → **Deployments**
2. Xem **Build Logs** để đảm bảo route được build
3. Kiểm tra **Function Logs** khi gọi `/api/auth/providers`

### Bước 5: Verify Route Handler Export

Đảm bảo `handlers` từ `@/auth` export đúng:

**File**: `bkquiz-web/src/auth.ts`

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  // ... config
});
```

---

## 🔍 Debug Steps

### 1. Test Route Handler trực tiếp

Truy cập trực tiếp trong browser:
```
https://bkquiz.vercel.app/api/auth/providers
```

Nếu vẫn 404 → Route handler chưa được deploy đúng.

### 2. Kiểm tra Vercel Function Logs

1. Vào Vercel Dashboard → Project → **Functions**
2. Tìm function `/api/auth/[...nextauth]`
3. Xem logs khi gọi endpoint

### 3. Kiểm tra Build Output

Trong Vercel build logs, tìm:
```
Route (app)                              Size     First Load JS
┌ ○ /api/auth/[...nextauth]             XXX kB         XXX kB
```

Nếu không thấy → Route không được build.

---

## 💡 Common Issues

### Issue 1: Route không được build

**Nguyên nhân**: File route handler không được Next.js detect.

**Giải pháp**:
1. Đảm bảo file ở đúng vị trí: `src/app/api/auth/[...nextauth]/route.ts`
2. Đảm bảo export đúng: `export const { GET, POST } = handlers;`
3. Clean build và rebuild

### Issue 2: Middleware block request

**Nguyên nhân**: Middleware đang block `/api/auth/*`.

**Giải pháp**: Đảm bảo middleware có:
```typescript
if (req.nextUrl.pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

### Issue 3: NextAuth v5 config issue

**Nguyên nhân**: NextAuth v5 (Auth.js) cần config khác với v4.

**Giải pháp**: Đảm bảo dùng NextAuth v5 syntax:
```typescript
export const { handlers } = NextAuth({ ... });
```

---

## ✅ Checklist

- [ ] File `src/app/api/auth/[...nextauth]/route.ts` tồn tại
- [ ] Route handler export `GET` và `POST` từ `handlers`
- [ ] Middleware cho phép `/api/*` pass-through
- [ ] Build thành công (không có lỗi)
- [ ] Route xuất hiện trong build output
- [ ] Vercel deploy thành công
- [ ] Test trực tiếp `/api/auth/providers` → không còn 404

---

## 🆘 Vẫn không được?

Nếu vẫn gặp lỗi sau khi thử tất cả:

1. **Kiểm tra Next.js version**: Đảm bảo dùng Next.js 13+ (App Router)
2. **Kiểm tra NextAuth version**: Đảm bảo dùng NextAuth v5
3. **Tạo route handler mới**: Xóa và tạo lại file route handler
4. **Check Vercel logs**: Xem lỗi cụ thể trong Function Logs

---

**Chúc bạn fix thành công! 🎉**

