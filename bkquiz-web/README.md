# 🎓 BKquiz Web Application

Next.js fullstack application cho hệ thống quiz trên lớp với xác nhận hiện diện bằng TOTP token.

## 📋 Tổng quan

BKquiz Web là phần frontend và backend của hệ thống BKquiz, được xây dựng với:

- **Next.js 16+** với App Router
- **TypeScript** cho type safety
- **Tailwind CSS 4** với custom design tokens
- **Prisma ORM** với PostgreSQL
- **Auth.js/NextAuth** cho authentication
- **next-intl** cho đa ngôn ngữ
- **KaTeX** cho render LaTeX math expressions

## 🚀 Bắt đầu

### Yêu cầu

- Node.js 22+ và npm
- PostgreSQL database

### Cài đặt

```bash
# Cài đặt dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Chỉnh sửa .env.local với các giá trị phù hợp

# Generate Prisma client
npm run prisma:generate

# Chạy migrations
npm run prisma:migrate

# Chạy development server
npm run dev
```

Mở http://localhost:3000 để xem ứng dụng.

### Environment Variables

Tạo file `.env.local` với các biến sau:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth (NextAuth)
AUTH_SECRET="your-secret-key"  # Generate: openssl rand -base64 32
AUTH_GOOGLE_ID="..."           # Xem GOOGLE_OAUTH_SETUP.md
AUTH_GOOGLE_SECRET="..."       # Xem GOOGLE_OAUTH_SETUP.md
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Monitoring & Analytics
NEXT_PUBLIC_SENTRY_DSN="..."
NEXT_PUBLIC_POSTHOG_KEY="..."
```

> **📘 Hướng dẫn thiết lập Google OAuth**: Xem [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) để biết cách tạo Google OAuth app và lấy Client ID/Secret.

Xem `.env.example` để biết đầy đủ các biến môi trường.

## 📁 Cấu trúc dự án

```
bkquiz-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # Internationalized routes
│   │   │   ├── (auth)/         # Authenticated routes
│   │   │   │   └── dashboard/  # Dashboard pages
│   │   │   └── (marketing)/    # Marketing pages
│   │   ├── api/                # API routes
│   │   │   ├── classes/        # Classroom management
│   │   │   ├── quizzes/        # Quiz management
│   │   │   ├── pools/          # Question pool management
│   │   │   ├── sessions/       # Session runtime
│   │   │   └── attempts/       # Student attempts
│   │   ├── attempt/            # Student attempt pages
│   │   └── session/            # Session pages
│   ├── components/             # React components
│   │   ├── ui/                 # UI components (Button, Card, etc.)
│   │   └── MathRenderer.tsx    # LaTeX math renderer
│   ├── server/                 # Server-side utilities
│   │   ├── authz.ts            # Authorization helpers
│   │   ├── export/              # Markdown export
│   │   └── import/             # Markdown import
│   ├── libs/                   # Third-party configs
│   ├── locales/                # i18n messages
│   ├── styles/                 # Global styles
│   └── utils/                  # Utility functions
├── prisma/                     # Database schema & migrations
│   ├── schema.prisma           # Prisma schema
│   └── migrations/             # Migration files
└── public/                     # Static assets
```

## 🛠️ Development

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run dev:spotlight    # Start with Sentry Spotlight

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting errors
npm run check:types      # Type checking
npm run check:deps       # Check unused dependencies
npm run check:i18n       # Check i18n translations

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)

# Build
npm run build            # Production build
npm run start            # Start production server
npm run build-stats      # Build with bundle analyzer
```

### Database

```bash
# Generate migration từ schema changes
npm run prisma:migrate

# Xem database trong Prisma Studio
npm run db:studio
```

### Code Style

Project sử dụng:
- **ESLint** với Antfu config
- **Prettier** cho formatting
- **Conventional Commits** cho commit messages
- **Lefthook** cho git hooks

## 🎨 Design System

Project sử dụng custom design tokens với Tailwind CSS:

- **Colors**: Charcoal palette với orange primary
- **Typography**: Inter (sans) và JetBrains Mono (mono)
- **Components**: Button, Card, Badge, Input, Toast, Table
- **Spacing**: Consistent spacing scale
- **Dark theme**: Optimized cho dark mode

Xem `docs/uiux/guide/style.md` để biết chi tiết về design system.

## 📚 Tính năng chính

### 1. Authentication
- Google OAuth login
- Role-based access (Teacher/Student)
- Session management

### 2. Classroom Management
- Tạo và quản lý lớp học
- Join lớp bằng class code
- Quản lý thành viên

### 3. Question Bank
- Quản lý question pools
- Import/export Markdown
- Tag management
- Share pools với permissions
- LaTeX math rendering

### 4. Quiz Creation
- Tạo quiz với rules linh hoạt
- Same-set và variant-set modes
- Preview đủ/thiếu câu hỏi

### 5. Session Runtime
- Start/end session
- Teacher screen với QR code và TOTP token
- Real-time countdown

### 6. Student Attempt
- Join session
- Làm bài với navigation
- Checkpoint token verification
- Auto-save và submit

## 📖 Tài liệu

- [Root README](../README.md) - Tổng quan dự án
- [Architecture](../docs/architecture.md) - Kiến trúc hệ thống
- [Database Schema](../docs/database.md) - Database schema
- [API Documentation](../docs/api.md) - API endpoints
- [UI/UX Guidelines](../docs/uiux/README.md) - Design guidelines
- [Markdown Import](../docs/import.md) - Import format

## 🧪 Testing

### Unit Tests

Tests được đặt cùng với source code, format `*.test.ts` hoặc `*.test.tsx`:

```bash
npm run test
```

### E2E Tests

Sử dụng Playwright, format `*.e2e.ts`:

```bash
# Cài đặt Playwright browsers (lần đầu)
npx playwright install

# Chạy E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Build Production

```bash
npm run build
npm run start
```

### Environment Variables cho Production

Đảm bảo set các biến môi trường sau trong hosting provider:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- Các biến khác tùy theo tính năng sử dụng

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Kiểm tra connection
npm run db:studio

# Reset database (dev only)
npm run prisma:migrate reset
```

### Type Errors

```bash
# Check types
npm run check:types

# Regenerate Prisma client
npm run prisma:generate
```

## 📝 Commit Convention

Project sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Sử dụng interactive commit helper
npm run commit
```

## 🤝 Contributing

Xem [Root README](../README.md) để biết hướng dẫn contributing.

## 📄 License

MIT License - xem [LICENSE](LICENSE) để biết thêm chi tiết.

---

Made with ❤️ for education
