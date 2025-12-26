# 🚀 Deployment Guide

Hướng dẫn deploy BKquiz lên production.

## 📋 Tổng quan

BKquiz là Next.js fullstack application, có thể deploy lên:
- **Vercel** (Recommended) - Optimized cho Next.js
- **Supabase** - Database + Storage (xem [DEPLOYMENT_SUPABASE.md](./DEPLOYMENT_SUPABASE.md))
- **Docker** - Self-hosted hoặc cloud platforms
- **Other platforms** - Bất kỳ platform nào hỗ trợ Node.js

> **📘 Hướng dẫn Supabase**: Xem [DEPLOYMENT_SUPABASE.md](./DEPLOYMENT_SUPABASE.md) để biết cách deploy với Supabase PostgreSQL và Storage.

---

## 🎯 Option 1: Deploy lên Vercel (Recommended)

### Yêu cầu
- Vercel account (free tier available)
- GitHub repository
- PostgreSQL database (Neon, Supabase, hoặc self-hosted)
- S3-compatible storage (AWS S3, Cloudflare R2, hoặc MinIO)

### Bước 1: Prepare Repository
```bash
# Đảm bảo code đã push lên GitHub
git push origin main
```

### Bước 2: Deploy trên Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `bkquiz-web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Bước 3: Environment Variables
Thêm các biến môi trường trong Vercel Dashboard:

#### Required Variables
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Auth
AUTH_SECRET="your-secret-key-here"  # Generate: openssl rand -base64 32
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# S3 Storage
S3_ENDPOINT="https://s3.amazonaws.com"  # hoặc endpoint của bạn
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="bkquiz-media"
```

#### Optional Variables
```env
# Monitoring
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
SENTRY_ORGANIZATION="your-org"
SENTRY_PROJECT="your-project"
SENTRY_AUTH_TOKEN="your-auth-token"

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Logging
NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN="your-better-stack-token"
NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST="in.logs.betterstack.com"

# Security
ARCJET_KEY="your-arcjet-key"  # Bot protection
```

### Bước 4: Database Setup
1. **Tạo database** (Neon, Supabase, hoặc self-hosted PostgreSQL)
2. **Run migrations**:
   ```bash
   # Local
   cd bkquiz-web
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   
   # Hoặc dùng Vercel CLI
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### Bước 5: S3 Setup
1. **Tạo S3 bucket** (AWS S3, Cloudflare R2, hoặc MinIO)
2. **Configure CORS**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://your-domain.com"],
       "ExposeHeaders": []
     }
   ]
   ```
3. **Set bucket policy** (nếu dùng public-read):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::bkquiz-media/*"
       }
     ]
   }
   ```

### Bước 6: Deploy
1. Click "Deploy" trong Vercel Dashboard
2. Chờ build và deploy hoàn tất
3. Truy cập URL được cung cấp

### Bước 7: Custom Domain (Optional)
1. Vào Project Settings → Domains
2. Add custom domain
3. Configure DNS records theo hướng dẫn

---

## 🐳 Option 2: Deploy với Docker

### Yêu cầu
- Docker và Docker Compose
- PostgreSQL database
- S3-compatible storage

### Bước 1: Tạo Dockerfile
Tạo file `bkquiz-web/Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Bước 2: Update next.config.ts
Thêm output: 'standalone':

```typescript
const baseConfig: NextConfig = {
  output: 'standalone', // For Docker
  // ... rest of config
};
```

### Bước 3: Docker Compose
Tạo `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: ./bkquiz-web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
      - AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
      - S3_BUCKET=${S3_BUCKET}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Bước 4: Deploy
```bash
# Build và start
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔒 Production Security Checklist

### Environment Variables
- ✅ Tất cả secrets đều từ environment variables
- ✅ Không hardcode credentials trong code
- ✅ Sử dụng secrets management (Vercel Secrets, AWS Secrets Manager, etc.)

### Database
- ✅ Sử dụng connection pooling
- ✅ Enable SSL/TLS cho database connection
- ✅ Regular backups
- ✅ Strong passwords

### API Security
- ✅ Rate limiting (Arcjet)
- ✅ CORS properly configured
- ✅ Input validation
- ✅ Server-side time validation (không trust client)

### HTTPS
- ✅ SSL/TLS certificates (Let's Encrypt, Cloudflare, etc.)
- ✅ HTTP to HTTPS redirect
- ✅ Security headers (HSTS, CSP, etc.)

### Monitoring
- ✅ Error tracking (Sentry)
- ✅ Logging (Better Stack)
- ✅ Analytics (PostHog)
- ✅ Health checks

---

## 📊 Health Checks

### Vercel
Vercel tự động cung cấp health checks. Có thể thêm custom endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Docker
Thêm health check vào docker-compose:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 🔄 CI/CD

Project đã có GitHub Actions workflows:
- **CI**: Build và test trên mỗi PR
- **Release**: Tự động release khi merge vào main

Xem `.github/workflows/` để biết chi tiết.

---

## 📝 Post-Deployment

### 1. Verify Deployment
- ✅ Truy cập URL và test login
- ✅ Test tạo class, quiz, session
- ✅ Test student flow
- ✅ Check error logs (Sentry)

### 2. Database Migrations
Sau mỗi deploy có schema changes:
```bash
npx prisma migrate deploy
```

### 3. Monitor
- Check Sentry cho errors
- Check Better Stack cho logs
- Check PostHog cho analytics
- Monitor database performance

---

## 🆘 Troubleshooting

Xem [TROUBLESHOOTING.md](TROUBLESHOOTING.md) để biết cách xử lý lỗi thường gặp.

---

## 📚 Tài liệu liên quan

- [Local Setup](bkquiz-web/LOCAL_SETUP.md) - Development setup
- [Architecture](docs/architecture.md) - System architecture
- [Security](docs/security.md) - Security best practices
