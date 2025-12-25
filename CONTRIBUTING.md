# 🤝 Contributing to BKquiz

Cảm ơn bạn đã quan tâm đến việc đóng góp cho BKquiz! Tài liệu này sẽ hướng dẫn bạn cách contribute.

## 📋 Mục lục

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)

---

## 📜 Code of Conduct

Chúng tôi cam kết tạo một môi trường open source thân thiện và tôn trọng. Vui lòng:
- Sử dụng ngôn ngữ tôn trọng và chuyên nghiệp
- Chấp nhận feedback một cách xây dựng
- Tập trung vào những gì tốt nhất cho cộng đồng

---

## 🚀 Getting Started

### 1. Fork Repository
1. Fork repository trên GitHub
2. Clone fork của bạn:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bkquiz.git
   cd bkquiz
   ```

### 2. Setup Remote
```bash
# Add upstream remote
git remote add upstream https://github.com/trungtv/bkquiz.git

# Verify remotes
git remote -v
```

### 3. Create Branch
```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# hoặc
git checkout -b fix/your-bug-fix
```

---

## 💻 Development Setup

### Prerequisites
- Node.js 22+ và npm
- PostgreSQL (hoặc dùng Docker)
- Git

### Setup Steps

1. **Install Dependencies**
   ```bash
   cd bkquiz-web
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   # Chỉnh sửa .env.local với các giá trị phù hợp
   ```

3. **Database Setup**
   ```bash
   # Start Docker services (nếu dùng Docker)
   cd ..
   docker compose up -d

   # Generate Prisma client
   cd bkquiz-web
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   - http://localhost:3000

Xem [LOCAL_SETUP.md](bkquiz-web/LOCAL_SETUP.md) để biết chi tiết.

---

## ✏️ Making Changes

### Branch Naming
Sử dụng prefix rõ ràng:
- `feature/` - Tính năng mới
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Tests
- `chore/` - Maintenance tasks

Ví dụ:
- `feature/mobile-sidebar-navigation`
- `fix/student-review-window`
- `docs/update-deployment-guide`

### Commit Messages
Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Tính năng mới
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semi colons, etc.
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat(dashboard): add mobile sidebar navigation

- Add hamburger menu button for mobile
- Implement responsive sidebar with overlay
- Auto-close sidebar on route changes

Closes #123
```

```
fix(api): correct review window validation

Server-side time check was missing for review access.
Now properly validates reviewWindowEnd on server.

Fixes #456
```

---

## 🎨 Code Style

### TypeScript
- Sử dụng TypeScript strict mode
- Type safety cho tất cả functions
- Avoid `any` type (dùng `unknown` nếu cần)

### ESLint & Prettier
Project sử dụng ESLint với Antfu config:
```bash
# Check linting
npm run lint

# Auto-fix
npm run lint:fix
```

### Code Formatting
- 2 spaces indentation
- Semicolons
- Single quotes cho strings
- Trailing commas

### Component Structure
```typescript
// 1. Imports
import { ... } from '...';

// 2. Types
type ComponentProps = { ... };

// 3. Component
export function Component(props: ComponentProps) {
  // Hooks
  const [state, setState] = useState(...);
  
  // Effects
  useEffect(() => { ... }, []);
  
  // Handlers
  const handleClick = () => { ... };
  
  // Render
  return ( ... );
}
```

### File Naming
- Components: `PascalCase.tsx` (ví dụ: `StudentAttempt.tsx`)
- Utilities: `camelCase.ts` (ví dụ: `formatDate.ts`)
- API routes: `route.ts` trong thư mục API

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Requirements
- ✅ New features cần có tests
- ✅ Bug fixes cần có regression tests
- ✅ API endpoints cần có integration tests
- ✅ Critical user flows cần có E2E tests

### Writing Tests
- Sử dụng Vitest cho unit tests
- Sử dụng Playwright cho E2E tests
- Test files: `*.test.ts` hoặc `*.spec.ts`

---

## 📤 Submitting Changes

### 1. Update Your Branch
```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git checkout feature/your-feature
git rebase upstream/main
```

### 2. Run Checks
```bash
# Type checking
npm run check:types

# Linting
npm run lint

# Tests
npm run test
npm run test:e2e
```

### 3. Push to Your Fork
```bash
git push origin feature/your-feature
```

### 4. Create Pull Request
1. Truy cập GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill PR template:
   - **Title**: Clear và descriptive
   - **Description**: 
     - What changes?
     - Why?
     - How to test?
     - Screenshots (nếu có UI changes)
   - **Related Issues**: Link issues nếu có

### 5. PR Review Process
- Maintainers sẽ review code
- Address feedback và update PR
- Sau khi approved, maintainers sẽ merge

---

## 🐛 Issue Reporting

### Before Reporting
1. Check existing issues
2. Verify bug với latest version
3. Search closed issues

### Bug Report Template
```markdown
**Describe the bug**
Clear description của bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment**
- OS: [e.g. macOS 14.0]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

**Additional context**
Any other context.
```

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
Clear description của problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Alternative solutions.

**Additional context**
Any other context.
```

---

## 📚 Documentation

### Code Comments
- Comment complex logic
- JSDoc cho public APIs
- Explain "why" không chỉ "what"

### Documentation Updates
- Update README nếu có breaking changes
- Update API docs nếu có API changes
- Update user guides nếu có UI/UX changes

---

## 🎯 Areas for Contribution

### High Priority
- 🐛 Bug fixes
- 📚 Documentation improvements
- 🧪 Test coverage
- ♿ Accessibility improvements
- 🌐 Internationalization (i18n)

### Medium Priority
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🔒 Security enhancements
- 📊 Analytics và monitoring

### Nice to Have
- 🎨 Design system improvements
- 📱 Mobile optimizations
- 🔌 Third-party integrations
- 🧩 New features

---

## ❓ Questions?

- **GitHub Discussions**: [Q&A](https://github.com/trungtv/bkquiz/discussions/categories/q-a) - Cho questions và discussions
- **GitHub Issues**: Open an issue với label `question`
- Check existing documentation
- Review code comments

Xem [Community Guide](../docs/COMMUNITY.md) để biết về các kênh giao tiếp.

---

## 🙏 Thank You!

Mọi đóng góp đều được đánh giá cao. Cảm ơn bạn đã giúp làm cho BKquiz tốt hơn!
