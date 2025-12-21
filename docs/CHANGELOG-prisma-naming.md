# Changelog: Prisma Naming Conventions Migration

## Tổng quan

Dự án đã được chuẩn hóa để sử dụng **PascalCase** cho tất cả Prisma relation fields, đảm bảo tính nhất quán và tuân theo conventions của Prisma.

## Các thay đổi

### 1. Relation Fields (PascalCase)

**Trước:**
```typescript
where: { quiz: { createdByTeacherId: userId } }
select: { quiz: { select: { title: true } } }
include: { rules: true }
_count: { select: { attempts: true } }
```

**Sau:**
```typescript
where: { Quiz: { createdByTeacherId: userId } }
select: { Quiz: { select: { title: true } } }
include: { QuizRule: true }
_count: { select: { Attempt: true } }
```

### 2. Files đã được cập nhật

#### API Routes
- `src/app/api/sessions/route.ts`
- `src/app/api/classes/[classId]/sessions/route.ts`
- `src/app/api/sessions/[sessionId]/*` (start, end, status, teacherToken, report/*)
- `src/app/api/attempts/[attemptId]/*` (submit, state)
- `src/app/api/students/performance/route.ts`
- `src/app/api/quizzes/route.ts`
- `src/app/api/quizzes/[quizId]/preview/route.ts`

#### Server Components
- `src/app/[locale]/(auth)/dashboard/page.tsx`
- `src/app/[locale]/(auth)/dashboard/TeacherDashboard.tsx`
- `src/app/[locale]/(auth)/dashboard/quizzes/page.tsx`
- `src/server/quizSnapshot.ts`

### 3. Mapping trong API Responses

Để giữ backward compatibility với frontend, API responses vẫn dùng lowercase:

```typescript
// Prisma query (PascalCase)
const session = await prisma.quizSession.findUnique({
  select: { Quiz: { select: { title: true } } },
});

// API response (lowercase cho frontend)
return NextResponse.json({
  quiz: session.Quiz,  // Map PascalCase → lowercase
});
```

### 4. Checklist Migration

- [x] Schema đã dùng PascalCase cho tất cả relation fields
- [x] Prisma client đã được regenerate
- [x] Tất cả `where` clauses đã dùng PascalCase
- [x] Tất cả `select/include` đã dùng PascalCase
- [x] Tất cả `_count` fields đã dùng PascalCase
- [x] API responses map PascalCase → lowercase
- [x] Tài liệu naming conventions đã được tạo

## Breaking Changes

**Không có breaking changes** vì:
- API responses vẫn dùng lowercase (backward compatible)
- Frontend không bị ảnh hưởng
- Chỉ thay đổi internal Prisma queries

## Testing

Sau khi migration, cần test:
1. ✅ Dashboard page loads correctly
2. ✅ Quiz creation and listing
3. ✅ Session creation and management
4. ✅ Question pool operations
5. ✅ Class management

## Tài liệu

Xem `docs/prisma-naming-conventions.md` để biết chi tiết về naming conventions.

