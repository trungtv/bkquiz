# 🎓 BKquiz

Hệ thống quiz trên lớp với xác nhận hiện diện bằng token động (TOTP) và checkpoint per-student.

![BKquiz Dashboard](docs/images/dashboard.png)

## 📋 Tổng quan

BKquiz là nền tảng web fullstack (Next.js) phục vụ việc tổ chức và quản lý quiz trên lớp học, với các tính năng chính:

- **Quản lý lớp học**: Tạo lớp, join lớp bằng class code, quản lý thành viên
- **Question Bank**: Quản lý question pools, tags, import/export Markdown
- **Tạo Quiz**: Tạo quiz với rules linh hoạt (same-set hoặc variant-set), preview đủ/thiếu câu
- **Session Runtime**: Start session, hiển thị QR code và TOTP token động cho sinh viên
- **Attempt & Scoring**: Sinh viên làm bài, tự động chấm điểm
- **Presence Check**: Xác nhận hiện diện bằng TOTP token với checkpoint schedule

## 🏗️ Kiến trúc

- **Frontend**: Next.js 16+ App Router (Teacher UI + Student UI)
  - Responsive design với mobile sidebar navigation
  - Client-side state management với React hooks
  - Real-time updates qua polling
- **Backend**: Next.js Route Handlers (`app/api/...`)
  - Server-side validation và authorization
  - Time-based security checks (server-side)
- **Auth**: Auth.js/NextAuth (Google OAuth)
- **Database**: PostgreSQL + Prisma ORM
  - JSONB fields cho flexible settings (sessionName, reviewWindowMinutes, etc.)
  - Caching question scores trong Attempt model
- **Styling**: Tailwind CSS 4 với custom design tokens
- **i18n**: next-intl (hỗ trợ đa ngôn ngữ)

## 📁 Cấu trúc dự án

```
BKquiz/
├── bkquiz-web/          # Next.js application
│   ├── src/
│   │   ├── app/         # App Router pages & API routes
│   │   ├── components/  # React components
│   │   ├── server/      # Server-side utilities
│   │   └── ...
│   ├── prisma/          # Database schema & migrations
│   └── ...
├── docs/                # Tài liệu dự án
│   ├── architecture.md  # Kiến trúc hệ thống
│   ├── database.md      # Database schema
│   ├── api.md           # API documentation
│   ├── flows.md         # User flows
│   ├── import.md        # Markdown import format
│   └── uiux/            # UI/UX design docs
└── README.md            # File này
```

## 🚀 Bắt đầu

### Yêu cầu

- Node.js 22+ và npm
- PostgreSQL database (hoặc dùng Neon/PGlite cho development)

### Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd BKquiz

# Cài đặt dependencies
cd bkquiz-web
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

Xem `bkquiz-web/.env.example` để biết các biến môi trường cần thiết.

## 📚 Tài liệu

### Core Documentation
- [Kiến trúc hệ thống](docs/architecture.md)
- [Database schema](docs/database.md)
- [API documentation](docs/api.md)
- [User flows](docs/flows.md)
- [Markdown import format](docs/import.md)
- [UI/UX guidelines](docs/uiux/README.md)

### Setup & Deployment
- [Deployment Guide](DEPLOYMENT.md) - Hướng dẫn deploy production
- [Local Setup](bkquiz-web/LOCAL_SETUP.md) - Development setup với Docker
- [Troubleshooting](TROUBLESHOOTING.md) - Xử lý lỗi thường gặp

### Contributing
- [Contributing Guide](CONTRIBUTING.md) - Hướng dẫn đóng góp
- [Changelog](CHANGELOG.md) - Lịch sử thay đổi

## 🎯 Tính năng chính

### 1. Classroom Management
- Tạo lớp học với class code
- Join lớp bằng class code (với confirmation modal)
- Quản lý thành viên (teacher/student)
- Xem danh sách sessions của lớp
- Responsive mobile sidebar navigation

### 2. Question Bank
- Tạo và quản lý question pools
- Import/export Markdown format
- Quản lý tags
- Share pools với quyền (view/use/edit)
- Hỗ trợ LaTeX math expressions

### 3. Quiz Creation
- Tạo quiz độc lập (không gắn với lớp cụ thể)
- Cấu hình rules theo tag và pool
- Mode same-set: tất cả sinh viên cùng đề
- Mode variant-set: đề chung + đề riêng cho mỗi SV
- Preview đủ/thiếu câu hỏi theo rules

### 4. Session Runtime
- Start/end session với tên session tùy chỉnh
- Teacher Screen: QR code + TOTP token động
- Materialize và snapshot câu hỏi
- Real-time countdown và student count
- Auto-start/auto-end với buffer time

### 5. Student Attempt
- Join session bằng QR code hoặc link
- Student lobby với explicit join button
- Làm bài với navigation linh hoạt
- Checkpoint token verification
- Auto-save answers (offline/online sync)
- Submit và xem điểm tổng ngay sau khi submit
- **Review bài làm**: Xem đáp án đúng/sai trong cửa sổ thời gian (review window) sau khi session kết thúc

## 🛠️ Development

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run dev:spotlight    # Start with Sentry Spotlight

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run db:studio        # Open Drizzle Studio

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting errors
npm run check:types      # Type checking
npm run check:deps       # Check unused dependencies

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests

# Build
npm run build            # Production build
npm run start            # Start production server
```

## 📝 Markdown Import Format

BKquiz hỗ trợ import câu hỏi từ Markdown file. Xem [docs/import.md](docs/import.md) và [docs/questions.md](docs/questions.md) để biết format chi tiết.

Ví dụ:

```markdown
---
pool:
  name: "DSA Week 1"
  visibility: "private"
---

# QUESTION:
Stack là cấu trúc dữ liệu hoạt động theo nguyên tắc nào?
## TAGS: ["stack", "basics"]
## ANSWER:
(x) LIFO (Last In, First Out)
( ) FIFO (First In, First Out)
( ) Random
```

## 💬 Community

- [GitHub Discussions](https://github.com/trungtv/bkquiz/discussions) - Q&A, Ideas, General discussions
- [GitHub Issues](https://github.com/trungtv/bkquiz/issues) - Bug reports, Feature requests

Xem [Community Guide](docs/COMMUNITY.md) để biết thêm về các kênh giao tiếp.

## 🤝 Contributing

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repository
2. Tạo feature branch
3. Commit changes (theo [Conventional Commits](https://www.conventionalcommits.org/))
4. Push và tạo Pull Request

Xem [Contributing Guide](CONTRIBUTING.md) để biết chi tiết.

## 📄 License

Apache License 2.0 - xem [LICENSE](LICENSE) để biết thêm chi tiết.

**Tại sao chọn Apache 2.0?**
- ✅ **Bảo vệ bằng sáng chế**: Quan trọng cho educational/commercial adoption
- ✅ **Tự do sử dụng**: Tự do sử dụng, chỉnh sửa, phân phối
- ✅ **Yêu cầu ghi nhận**: Tăng tính minh bạch và traceability
- ✅ **Enterprise-friendly**: Nhiều tổ chức giáo dục và doanh nghiệp ưa chuộng
- ✅ **Vẫn rất permissive**: Giống MIT nhưng có thêm legal protections

## 👥 Contributors

- TrungTV

---

Made with ❤️ for education

