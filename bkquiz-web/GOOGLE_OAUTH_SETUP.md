# 🔐 Hướng dẫn thiết lập Google OAuth

Tài liệu này hướng dẫn cách tạo Google OAuth app để sử dụng tính năng đăng nhập với Google trong BKquiz.

---

## 📋 Yêu cầu

- Tài khoản Google (Gmail)
- Quyền truy cập Google Cloud Console

---

## 🚀 Các bước thiết lập

### Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn
3. Click vào dropdown project ở thanh trên cùng (hoặc click "Select a project")
4. Click **"NEW PROJECT"**
5. Điền thông tin:
   - **Project name**: `BKquiz` (hoặc tên bạn muốn)
   - **Organization**: (để trống nếu không có)
   - **Location**: (để trống hoặc chọn organization nếu có)
6. Click **"CREATE"**
7. Chờ vài giây, sau đó chọn project vừa tạo

### Bước 2: Bật Google+ API

1. Trong Google Cloud Console, vào **"APIs & Services"** → **"Library"** (hoặc truy cập [API Library](https://console.cloud.google.com/apis/library))
2. Tìm kiếm **"Google+ API"** hoặc **"Google Identity Services API"**
3. Click vào **"Google Identity Services API"** (hoặc **"Google+ API"** nếu vẫn còn)
4. Click **"ENABLE"**

> **Lưu ý**: Google đã deprecated Google+ API, nhưng OAuth 2.0 vẫn hoạt động. Nếu không tìm thấy, bạn có thể bỏ qua bước này và chuyển sang Bước 3.

### Bước 3: Tạo OAuth 2.0 Credentials

1. Vào **"APIs & Services"** → **"Credentials"** (hoặc truy cập [Credentials](https://console.cloud.google.com/apis/credentials))
2. Click **"+ CREATE CREDENTIALS"** ở trên cùng
3. Chọn **"OAuth client ID"**
4. Nếu lần đầu tiên, bạn sẽ thấy màn hình **"Configure OAuth consent screen"**:
   - Chọn **"External"** (hoặc **"Internal"** nếu bạn dùng Google Workspace)
   - Click **"CREATE"**
   - Điền thông tin:
     - **App name**: `BKquiz`
     - **User support email**: Email của bạn
     - **Developer contact information**: Email của bạn
   - Click **"SAVE AND CONTINUE"**
   - Ở màn hình **"Scopes"**, click **"SAVE AND CONTINUE"** (không cần thêm scope)
   - Ở màn hình **"Test users"** (nếu là External), bạn có thể thêm email test hoặc bỏ qua, click **"SAVE AND CONTINUE"**
   - Ở màn hình **"Summary"**, click **"BACK TO DASHBOARD"**
5. Quay lại màn hình **"Create OAuth client ID"**:
   - **Application type**: Chọn **"Web application"**
   - **Name**: `BKquiz Web Client` (hoặc tên bạn muốn)
   - **Authorized JavaScript origins**:
     - Thêm: `http://localhost:3000` (cho development)
     - Thêm: `https://yourdomain.com` (cho production, thay `yourdomain.com` bằng domain thực tế)
   - **Authorized redirect URIs**:
     - Thêm: `http://localhost:3000/api/auth/callback/google` (cho development)
     - Thêm: `https://yourdomain.com/api/auth/callback/google` (cho production)
6. Click **"CREATE"**
7. Bạn sẽ thấy popup với **Client ID** và **Client Secret**:
   - **Lưu lại 2 giá trị này ngay!** (Client Secret chỉ hiển thị 1 lần)

### Bước 4: Cấu hình Environment Variables

1. Mở file `.env.local` trong thư mục `bkquiz-web/` (nếu chưa có, copy từ `.env.example`)
2. Thêm hoặc cập nhật các biến sau:

```env
# Google OAuth
AUTH_GOOGLE_ID=your-client-id-here.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret-here

# NextAuth Secret (bắt buộc)
AUTH_SECRET=your-random-secret-here
```

3. **Tạo AUTH_SECRET**:
   - Chạy lệnh: `openssl rand -base64 32` (trên macOS/Linux)
   - Hoặc sử dụng [online generator](https://generate-secret.vercel.app/32)
   - Copy kết quả và paste vào `AUTH_SECRET`

### Bước 5: Kiểm tra

1. Khởi động lại development server:
   ```bash
   npm run dev
   ```
2. Truy cập `http://localhost:3000/sign-in`
3. Click **"Đăng nhập với Google"**
4. Bạn sẽ được chuyển đến trang Google để đăng nhập
5. Sau khi đăng nhập thành công, bạn sẽ được redirect về dashboard

---

## 🔧 Cấu hình cho Production

Khi deploy lên production (ví dụ: Vercel):

1. **Thêm Redirect URI mới trong Google Cloud Console**:
   - Vào **"APIs & Services"** → **"Credentials"**
   - Click vào OAuth client bạn đã tạo
   - Thêm vào **"Authorized redirect URIs"**:
     - `https://your-production-domain.com/api/auth/callback/google`
   - Click **"SAVE"**

2. **Thêm Environment Variables trong Vercel** (hoặc platform bạn dùng):
   - Vào **Settings** → **Environment Variables**
   - Thêm:
     - `AUTH_GOOGLE_ID`: Client ID của bạn
     - `AUTH_GOOGLE_SECRET`: Client Secret của bạn
     - `AUTH_SECRET`: Secret bạn đã tạo (có thể dùng chung với development hoặc tạo mới)

3. **Redeploy** ứng dụng

---

## ⚠️ Lưu ý quan trọng

### Security

- **KHÔNG commit** `.env.local` vào git (đã có trong `.gitignore`)
- **KHÔNG chia sẻ** Client Secret công khai
- Sử dụng **AUTH_SECRET** khác nhau cho development và production

### OAuth Consent Screen

- Nếu bạn chọn **"External"**, app của bạn sẽ ở trạng thái **"Testing"** ban đầu
- Chỉ có các email trong **"Test users"** mới đăng nhập được
- Để publish app (cho phép mọi người đăng nhập), bạn cần:
  1. Hoàn thành OAuth consent screen (thêm logo, privacy policy, terms of service)
  2. Submit để Google review (nếu cần)
  3. Publish app

### Rate Limits

- Google OAuth có rate limits:
  - **Testing mode**: 100 users
  - **Published**: Không giới hạn (nhưng có rate limit cho API calls)

---

## 🐛 Troubleshooting

### Lỗi: "redirect_uri_mismatch"

- **Nguyên nhân**: Redirect URI không khớp với cấu hình trong Google Cloud Console
- **Giải pháp**:
  1. Kiểm tra redirect URI trong code: `/api/auth/callback/google`
  2. Đảm bảo đã thêm đúng URI trong Google Cloud Console (bao gồm `http://` hoặc `https://`)
  3. Đảm bảo không có trailing slash: `/api/auth/callback/google` (không phải `/api/auth/callback/google/`)

### Lỗi: "access_denied"

- **Nguyên nhân**: User không có quyền truy cập (nếu app ở Testing mode)
- **Giải pháp**: Thêm email của user vào **"Test users"** trong OAuth consent screen

### Lỗi: "invalid_client"

- **Nguyên nhân**: Client ID hoặc Client Secret sai
- **Giải pháp**: Kiểm tra lại `.env.local` và đảm bảo không có khoảng trắng thừa

### Lỗi: "MissingSecret"

- **Nguyên nhân**: Thiếu `AUTH_SECRET` trong environment variables
- **Giải pháp**: Thêm `AUTH_SECRET` vào `.env.local` và khởi động lại server

---

## 📚 Tài liệu tham khảo

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## ✅ Checklist

- [ ] Đã tạo Google Cloud Project
- [ ] Đã bật Google Identity Services API (nếu cần)
- [ ] Đã tạo OAuth 2.0 Client ID
- [ ] Đã cấu hình Authorized redirect URIs
- [ ] Đã thêm `AUTH_GOOGLE_ID` vào `.env.local`
- [ ] Đã thêm `AUTH_GOOGLE_SECRET` vào `.env.local`
- [ ] Đã tạo và thêm `AUTH_SECRET` vào `.env.local`
- [ ] Đã test đăng nhập thành công ở localhost
- [ ] Đã cấu hình production redirect URIs (nếu deploy)
- [ ] Đã thêm environment variables vào production platform

---

**Chúc bạn thiết lập thành công! 🎉**
