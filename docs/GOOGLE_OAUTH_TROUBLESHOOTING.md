# 🐛 Troubleshooting Google OAuth - Lỗi `/api/auth/error`

## Vấn đề: Redirect đến `/api/auth/error` trên Production

Khi click "Đăng nhập với Google" trên production và bị redirect đến `/api/auth/error`, thường do một trong các nguyên nhân sau:

---

## ✅ Giải pháp 1: Kiểm tra Redirect URI trong Google Cloud Console

**Đây là nguyên nhân phổ biến nhất!**

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click vào OAuth client ID của bạn
4. Kiểm tra **"Authorized redirect URIs"** có đúng không:

```
https://bkquiz.vercel.app/api/auth/callback/google
```

> ⚠️ **QUAN TRỌNG**: 
> - Phải có `https://` (không phải `http://`)
> - Phải có `/api/auth/callback/google` (không có trailing slash)
> - Domain phải chính xác: `bkquiz.vercel.app` (hoặc domain custom của bạn)

5. Nếu chưa có, thêm vào và click **"SAVE"**
6. Đợi 1-2 phút để Google cập nhật
7. Thử lại đăng nhập

---

## ✅ Giải pháp 2: Set NEXT_PUBLIC_APP_URL trên Vercel

**Có nhất thiết phải set không?**

**Trả lời**: **KHÔNG bắt buộc**, nhưng **NÊN set** để đảm bảo NextAuth xác định đúng base URL.

### Cách set trên Vercel:

1. Vào Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Thêm biến:
   - **Name**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://bkquiz.vercel.app` (hoặc domain của bạn)
   - **Environment**: Production, Preview, Development
3. Click **"Save"**
4. **Redeploy** ứng dụng (hoặc đợi auto-deploy)

### Tại sao nên set?

- NextAuth tự động detect URL từ request headers, nhưng trên Vercel có thể không chính xác
- Set `NEXT_PUBLIC_APP_URL` đảm bảo NextAuth luôn dùng đúng base URL
- Giúp tránh lỗi redirect URI mismatch

---

## ✅ Giải pháp 3: Kiểm tra Environment Variables trên Vercel

Đảm bảo các biến sau đã được set:

| Variable | Value | Required |
|----------|-------|----------|
| `AUTH_GOOGLE_ID` | Client ID từ Google | ✅ Yes |
| `AUTH_GOOGLE_SECRET` | Client Secret từ Google | ✅ Yes |
| `AUTH_SECRET` | Random secret (32 chars) | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | `https://bkquiz.vercel.app` | ⚠️ Recommended |

---

## ✅ Giải pháp 4: Kiểm tra OAuth Consent Screen

Nếu app ở **Testing mode**:

1. Vào Google Cloud Console → **OAuth consent screen**
2. Kiểm tra **"Test users"**
3. Thêm email của bạn vào danh sách test users
4. Lưu và thử lại

---

## 🔍 Debug Steps

### Bước 1: Kiểm tra Redirect URI thực tế

1. Mở DevTools (F12) → Network tab
2. Click "Đăng nhập với Google"
3. Xem request đến Google OAuth
4. Kiểm tra `redirect_uri` parameter trong URL

Nó phải là:
```
redirect_uri=https://bkquiz.vercel.app/api/auth/callback/google
```

### Bước 2: So sánh với Google Cloud Console

Redirect URI trong request phải **khớp chính xác** với URI trong Google Cloud Console (bao gồm protocol, domain, path).

### Bước 3: Kiểm tra Vercel Logs

1. Vào Vercel Dashboard → Project → **Deployments**
2. Click vào deployment mới nhất
3. Xem **Logs** tab
4. Tìm lỗi liên quan đến OAuth

---

## 📋 Checklist nhanh

- [ ] Đã thêm `https://bkquiz.vercel.app/api/auth/callback/google` vào Google Cloud Console
- [ ] Đã set `AUTH_GOOGLE_ID` trên Vercel
- [ ] Đã set `AUTH_GOOGLE_SECRET` trên Vercel
- [ ] Đã set `AUTH_SECRET` trên Vercel
- [ ] Đã set `NEXT_PUBLIC_APP_URL=https://bkquiz.vercel.app` trên Vercel (khuyến nghị)
- [ ] Đã redeploy sau khi thay đổi environment variables
- [ ] Đã đợi 1-2 phút sau khi update Google Cloud Console

---

## 💡 Tips

1. **Dùng cùng 1 OAuth Client** cho localhost và production → Chỉ cần thêm cả 2 redirect URIs
2. **Set NEXT_PUBLIC_APP_URL** → Đảm bảo NextAuth dùng đúng base URL
3. **Kiểm tra domain chính xác** → `bkquiz.vercel.app` vs custom domain
4. **Đợi vài phút** sau khi update Google Cloud Console → Google cần thời gian sync

---

## 🆘 Vẫn không được?

Nếu vẫn gặp lỗi sau khi thử tất cả:

1. Kiểm tra Vercel logs để xem lỗi cụ thể
2. Kiểm tra Google Cloud Console → **APIs & Services** → **OAuth consent screen** → **Publishing status**
3. Thử tạo OAuth Client mới và cấu hình lại từ đầu
4. Kiểm tra domain có đúng không (có thể dùng custom domain thay vì `.vercel.app`)

---

**Chúc bạn fix thành công! 🎉**

