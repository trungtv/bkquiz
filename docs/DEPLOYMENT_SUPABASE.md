# 🚀 Hướng dẫn Deploy BKquiz lên Supabase

Hướng dẫn deploy bkquiz-web lên Supabase (database) và Vercel (Next.js app).

## 📋 Tổng quan

**Kiến trúc deployment:**
```
Next.js App (Vercel) → Supabase PostgreSQL (Database)
```

**Lưu ý:** S3 Storage là **optional** - chỉ cần khi implement image upload feature.

---

## 🎯 Bước 1: Tạo Supabase Project

1. Truy cập [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Điền thông tin:
   - **Name**: `bkquiz`
   - **Database Password**: Tạo password mạnh (lưu lại!)
   - **Region**: Chọn region gần nhất
4. Chờ setup hoàn tất (~2 phút)

---

## 🗄️ Bước 2: Setup Database

### 2.1. Lấy Connection String

Vào **Settings** → **Database** → **Connection string**:

- **Pooling mode (port 6543)**: Dùng cho production app
- **Direct connection (port 5432)**: Dùng cho migrations

**Format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ Nếu password có ký tự đặc biệt**, cần URL encode:
```bash
node -e "console.log(encodeURIComponent('YOUR_PASSWORD'))"
```

### 2.2. Cấu hình Environment Variables

**Trong Vercel (Production):**
```env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public"
```

**Trong `.env.local` (Local/Migrations):**
```env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?schema=public"
```

**Lưu ý:**
- Production app: Dùng port **6543** (pooling)
- Migrations: Dùng port **5432** (direct)

### 2.3. Chạy Migrations

```bash
cd bkquiz-web
npx prisma migrate deploy
```

**⚠️ Phải dùng direct connection (port 5432) cho migrations!**

---

## 📦 Bước 3: Setup Supabase Storage (Optional)

**Chỉ cần nếu implement image upload feature.**

### 3.1. Tạo Storage Bucket

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `bkquiz-media`
3. Public bucket: ✅ Bật

### 3.2. Environment Variables

```env
S3_ENDPOINT="https://[project-ref].supabase.co/storage/v1/s3"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="[project-ref]"
S3_SECRET_ACCESS_KEY="[service_role_key]"
S3_BUCKET="bkquiz-media"
```

**Lấy credentials:** Settings → **API** → Copy `service_role` key

---

## 🚀 Bước 4: Deploy lên Vercel

### 4.1. Setup Project

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**
2. Import GitHub repository
3. Configure:
   - **Root Directory**: `bkquiz-web`
   - **Framework**: Next.js
   - **Build Command**: `npm run build`

### 4.2. Environment Variables

**Required:**
```env
# Database
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public"

# Auth
AUTH_SECRET="your-secret-key"  # openssl rand -base64 32
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

**Optional (nếu dùng Storage):**
```env
S3_ENDPOINT="https://[project-ref].supabase.co/storage/v1/s3"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="[project-ref]"
S3_SECRET_ACCESS_KEY="[service_role_key]"
S3_BUCKET="bkquiz-media"
```

### 4.3. Deploy

Click **"Deploy"** và chờ hoàn tất.

---

## 🔄 Bước 5: Run Migrations

Sau khi deploy, chạy migrations:

```bash
# Option 1: Dùng Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Option 2: Set trực tiếp
DATABASE_URL="postgresql://...:5432/...?schema=public" npx prisma migrate deploy
```

**⚠️ Dùng direct connection (port 5432) cho migrations!**

---

## ✅ Bước 6: Verify

1. Test login/logout
2. Test tạo class, quiz, session
3. Test student flow
4. Check Vercel logs nếu có lỗi

---

## 📝 Checklist

- [ ] Supabase project created
- [ ] Database migrations run
- [ ] Vercel project configured
- [ ] Environment variables set
- [ ] Deploy successful
- [ ] Basic flows tested

---

## 🐛 Troubleshooting

Nếu gặp lỗi, xem:
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- Supabase Dashboard logs
- Vercel Dashboard logs

**Lỗi thường gặp:**
- **"invalid port number"**: Password có ký tự đặc biệt, cần URL encode
- **"prepared statement already exists"**: Dùng pooling mode cho migrations → đổi sang direct connection
- **"P3015"**: Migration directory rỗng → xóa directory rỗng

---

## 📚 Tài liệu tham khảo

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase)

---

Made with ❤️ for education
