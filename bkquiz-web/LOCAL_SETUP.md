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

Tạo file `.env` trong `bkquiz-web/`:

```bash
# Database
DATABASE_URL="postgresql://bkquiz:bkquiz@localhost:5433/bkquiz?schema=public"

# Auth.js / NextAuth
AUTH_SECRET="please-change-me"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# S3 (MinIO)
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET="bkquiz-media"
```

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
