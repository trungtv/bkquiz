## Local setup (Docker) — project `bkquiz`

### 1) Start services

Tại thư mục root repo (nơi có `docker-compose.yml`):

```bash
cd ..
docker compose up -d
```

Services:
- Postgres: `localhost:5433` (db/user/password: `bkquiz`)
- MinIO S3: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (user/pass: `minioadmin` / `minioadmin`)

Bucket dev mặc định: **`bkquiz-media`** (được tạo tự động bởi `minio-init`).

### 2) Env cho app

Copy `.env.example` thành `.env.local` trong `bkquiz-web/`:

```bash
cd bkquiz-web
cp .env.example .env.local
```

Sau đó chỉnh sửa `.env.local` với các giá trị phù hợp (đặc biệt là `DATABASE_URL` cho Docker setup):

```bash
# Database
DATABASE_URL="postgresql://bkquiz:bkquiz@localhost:5433/bkquiz?schema=public"

# Auth.js / NextAuth
AUTH_SECRET="please-change-me"  # Generate: openssl rand -base64 32
AUTH_GOOGLE_ID="..."           # Xem GOOGLE_OAUTH_SETUP.md để lấy
AUTH_GOOGLE_SECRET="..."       # Xem GOOGLE_OAUTH_SETUP.md để lấy
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# S3 (MinIO)
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET="bkquiz-media"
```

> **📘 Lưu ý**: Để lấy `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET`, xem hướng dẫn chi tiết trong [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md).

### 3) Prisma migrate

```bash
cd bkquiz-web
npx prisma migrate dev
```

### 4) Run web

```bash
cd bkquiz-web
npm run dev
```
