# 🔐 Cấu hình Google OAuth cho Localhost và Production

Hướng dẫn chi tiết cách cấu hình Google OAuth để hoạt động đồng thời trên **localhost** (development) và **production** (Vercel).

---

## 📋 Tổng quan

Google OAuth cho phép **1 OAuth Client ID** có nhiều **Authorized Redirect URIs**. Bạn chỉ cần:
1. Tạo **1 OAuth Client ID** duy nhất
2. Thêm **cả 2 redirect URIs** (localhost và production) vào cùng 1 client
3. Dùng **cùng Client ID và Secret** cho cả 2 môi trường

---

## 🚀 Các bước thiết lập

### Bước 1: Tạo Google Cloud Project (nếu chưa có)

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật **Google Identity Services API** (nếu chưa bật)

### Bước 2: Tạo OAuth 2.0 Client ID

1. Vào **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Nếu lần đầu, cấu hình **OAuth consent screen**:
   - Chọn **"External"** (hoặc **"Internal"** nếu dùng Google Workspace)
   - Điền thông tin cơ bản (App name, email support)
   - Click **"SAVE AND CONTINUE"** qua các bước

### Bước 3: Cấu hình Redirect URIs (QUAN TRỌNG)

Trong màn hình **"Create OAuth client ID"**:

**Application type**: Chọn **"Web application"**

**Name**: `BKquiz Web Client` (hoặc tên bạn muốn)

**Authorized JavaScript origins**:
```
http://localhost:3000
https://your-production-domain.vercel.app
```
> Thay `your-production-domain.vercel.app` bằng domain thực tế của bạn

**Authorized redirect URIs**:
```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.vercel.app/api/auth/callback/google
```
> ⚠️ **QUAN TRỌNG**: Phải có cả 2 URIs này trong cùng 1 OAuth client!

4. Click **"CREATE"**
5. **Lưu lại Client ID và Client Secret** (Secret chỉ hiển thị 1 lần!)

---

## 🔧 Cấu hình Environment Variables

### Localhost (`.env.local`)

Tạo file `.env.local` trong thư mục `bkquiz-web/`:

```env
# Google OAuth (dùng chung cho cả localhost và production)
AUTH_GOOGLE_ID=your-client-id-here.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret-here

# NextAuth Secret
AUTH_SECRET=your-random-secret-here

# App URL (cho localhost)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Tạo AUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Production (Vercel Dashboard)

1. Vào Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Thêm các biến sau:

| Variable | Value | Environment |
|----------|-------|-------------|
| `AUTH_GOOGLE_ID` | `your-client-id-here.apps.googleusercontent.com` | Production, Preview |
| `AUTH_GOOGLE_SECRET` | `your-client-secret-here` | Production, Preview |
| `AUTH_SECRET` | `your-random-secret-here` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production, Preview |

> **Lưu ý**: 
> - Có thể dùng **cùng Client ID/Secret** cho cả localhost và production
> - Nên dùng **AUTH_SECRET khác nhau** cho localhost và production (bảo mật hơn)

---

## ✅ Kiểm tra cấu hình

### Localhost

1. Khởi động dev server:
   ```bash
   cd bkquiz-web
   npm run dev
   ```

2. Truy cập `http://localhost:3000/sign-in`
3. Click **"Đăng nhập với Google"**
4. Nếu redirect thành công → ✅ Localhost OK

### Production

1. Deploy lên Vercel (hoặc platform khác)
2. Truy cập `https://your-domain.vercel.app/sign-in`
3. Click **"Đăng nhập với Google"**
4. Nếu redirect thành công → ✅ Production OK

---

## 🔄 Thêm domain mới (nếu cần)

Nếu bạn thêm domain mới hoặc preview deployment:

1. Vào Google Cloud Console → **Credentials**
2. Click vào OAuth client của bạn
3. Thêm vào **"Authorized redirect URIs"**:
   ```
   https://new-domain.com/api/auth/callback/google
   https://preview-branch.vercel.app/api/auth/callback/google
   ```
4. Click **"SAVE"**
5. Không cần thay đổi environment variables (dùng chung Client ID/Secret)

---

## ⚠️ Lưu ý quan trọng

### Security

- ✅ **Có thể dùng chung** Client ID/Secret cho localhost và production
- ⚠️ **Nên dùng AUTH_SECRET khác nhau** cho mỗi môi trường
- 🔒 **KHÔNG commit** `.env.local` vào git
- 🔒 **KHÔNG chia sẻ** Client Secret công khai

### OAuth Consent Screen

- Nếu chọn **"External"**, app ở trạng thái **"Testing"** ban đầu
- Chỉ các email trong **"Test users"** mới đăng nhập được
- Để publish (cho phép mọi người đăng nhập):
  1. Hoàn thành OAuth consent screen (logo, privacy policy, terms)
  2. Submit để Google review (nếu cần)
  3. Publish app

### Rate Limits

- **Testing mode**: 100 users
- **Published**: Không giới hạn users (nhưng có rate limit cho API calls)

---

## 🐛 Troubleshooting

### Lỗi: "redirect_uri_mismatch"

**Nguyên nhân**: Redirect URI không khớp với cấu hình

**Giải pháp**:
1. Kiểm tra URL hiện tại (localhost hay production?)
2. Đảm bảo đã thêm đúng URI trong Google Cloud Console:
   - `http://localhost:3000/api/auth/callback/google` (cho localhost)
   - `https://your-domain.com/api/auth/callback/google` (cho production)
3. Đảm bảo không có trailing slash
4. Đảm bảo protocol đúng (`http://` cho localhost, `https://` cho production)

### Lỗi: "access_denied"

**Nguyên nhân**: User không có quyền (app ở Testing mode)

**Giải pháp**: Thêm email của user vào **"Test users"** trong OAuth consent screen

### Lỗi: "invalid_client"

**Nguyên nhân**: Client ID hoặc Secret sai

**Giải pháp**:
1. Kiểm tra lại `.env.local` (localhost) hoặc Vercel Environment Variables (production)
2. Đảm bảo không có khoảng trắng thừa
3. Copy/paste lại từ Google Cloud Console

### Lỗi: "MissingSecret"

**Nguyên nhân**: Thiếu `AUTH_SECRET`

**Giải pháp**: Thêm `AUTH_SECRET` vào environment variables và restart

---

## 📝 Checklist

### Google Cloud Console
- [ ] Đã tạo Google Cloud Project
- [ ] Đã bật Google Identity Services API
- [ ] Đã tạo OAuth 2.0 Client ID
- [ ] Đã thêm `http://localhost:3000/api/auth/callback/google` vào Redirect URIs
- [ ] Đã thêm `https://your-domain.com/api/auth/callback/google` vào Redirect URIs
- [ ] Đã lưu Client ID và Client Secret

### Localhost
- [ ] Đã tạo `.env.local` với `AUTH_GOOGLE_ID`
- [ ] Đã tạo `.env.local` với `AUTH_GOOGLE_SECRET`
- [ ] Đã tạo và thêm `AUTH_SECRET`
- [ ] Đã thêm `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] Đã test đăng nhập thành công ở localhost

### Production (Vercel)
- [ ] Đã thêm `AUTH_GOOGLE_ID` vào Vercel Environment Variables
- [ ] Đã thêm `AUTH_GOOGLE_SECRET` vào Vercel Environment Variables
- [ ] Đã thêm `AUTH_SECRET` vào Vercel Environment Variables
- [ ] Đã thêm `NEXT_PUBLIC_APP_URL` với domain production
- [ ] Đã test đăng nhập thành công ở production

---

## 💡 Tips

1. **Dùng cùng 1 OAuth Client** cho cả localhost và production → Đơn giản hơn
2. **Dùng AUTH_SECRET khác nhau** cho mỗi môi trường → Bảo mật hơn
3. **Thêm preview URLs** vào Redirect URIs nếu cần test preview deployments
4. **Publish OAuth app** khi sẵn sàng cho production (không còn ở Testing mode)

---

**Chúc bạn cấu hình thành công! 🎉**

