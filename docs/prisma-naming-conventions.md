# Prisma Naming Conventions - BKquiz

## Tổng quan

Dự án BKquiz sử dụng **PascalCase** cho tất cả Prisma relation fields để đảm bảo tính nhất quán và tuân theo conventions của Prisma.

## Quy tắc chung

### 1. Relation Fields (PascalCase)

Tất cả relation fields trong Prisma queries phải dùng **PascalCase**, khớp với tên model:

```typescript
// ✅ ĐÚNG
where: { Quiz: { createdByTeacherId: userId } }
select: { Quiz: { select: { title: true } } }
include: { QuizRule: true }
_count: { select: { Attempt: true, QuizRule: true } }

// ❌ SAI
where: { quiz: { createdByTeacherId: userId } }  // lowercase
select: { quiz: { select: { title: true } } }   // lowercase
include: { rules: true }                         // lowercase
_count: { select: { attempts: true } }           // lowercase
```

### 2. Model Names (PascalCase)

Tất cả model names trong Prisma client đều là PascalCase:

```typescript
prisma.quiz.findMany()           // ✅ Model name: Quiz (lowercase trong client)
prisma.quizSession.findMany()    // ✅ Model name: QuizSession
prisma.classMembership.findMany() // ✅ Model name: ClassMembership
```

### 3. Relation Field Mapping

| Model | Relation Field | Type | Usage |
|-------|---------------|------|-------|
| `QuizSession` | `Quiz` | `Quiz` | `where: { Quiz: {...} }`, `select: { Quiz: {...} }` |
| `QuizSession` | `Classroom` | `Classroom` | `where: { Classroom: {...} }`, `select: { Classroom: {...} }` |
| `QuizSession` | `Attempt` | `Attempt[]` | `_count: { select: { Attempt: true } }` |
| `Quiz` | `QuizRule` | `QuizRule[]` | `where: { QuizRule: { none: {} } }`, `_count: { select: { QuizRule: true } }` |
| `Quiz` | `QuizSession` | `QuizSession[]` | `_count: { select: { QuizSession: true } }` |
| `ClassMembership` | `Classroom` | `Classroom` | `include: { Classroom: true }` |
| `ClassMembership` | `User` | `User` | `include: { User: true }` |
| `Attempt` | `QuizSession` | `QuizSession` | `select: { QuizSession: { select: { Quiz: {...} } } }` |

### 4. API Response Mapping

**Lưu ý quan trọng**: Trong API responses, chúng ta vẫn dùng **lowercase** để giữ backward compatibility với frontend:

```typescript
// Prisma query (PascalCase)
const session = await prisma.quizSession.findUnique({
  select: {
    Quiz: { select: { title: true } },
  },
});

// API response (lowercase cho frontend)
return NextResponse.json({
  quiz: session.Quiz,  // Map PascalCase → lowercase
});
```

### 5. Common Patterns

#### Where Clauses
```typescript
// Filter by relation
where: {
  Quiz: { createdByTeacherId: userId },
  Classroom: { id: classId },
  QuizRule: { none: {} },  // Quizzes without rules
}
```

#### Select/Include
```typescript
select: {
  Quiz: {
    select: {
      id: true,
      title: true,
    },
  },
  _count: {
    select: {
      Attempt: true,
      QuizRule: true,
    },
  },
}
```

#### Accessing Relations
```typescript
// In TypeScript code
session.Quiz.title           // ✅ PascalCase từ Prisma
session._count.Attempt       // ✅ PascalCase từ Prisma

// In API response
{ quiz: session.Quiz }       // ✅ Map to lowercase
```

## Checklist khi viết Prisma queries

- [ ] Tất cả relation fields trong `where` dùng PascalCase
- [ ] Tất cả relation fields trong `select/include` dùng PascalCase
- [ ] Tất cả `_count` fields dùng PascalCase
- [ ] API responses map PascalCase → lowercase cho frontend
- [ ] TypeScript types khớp với Prisma types

## Migration từ lowercase → PascalCase

Nếu gặp lỗi `Unknown field 'xxx'`, kiểm tra:
1. Schema đã dùng PascalCase chưa?
2. Prisma client đã được regenerate chưa? (`npx prisma generate`)
3. Code đã update sang PascalCase chưa?

## Ví dụ đầy đủ

```typescript
// ✅ ĐÚNG - TeacherDashboard.tsx
const activeSessions = await prisma.quizSession.findMany({
  where: {
    status: 'active',
    Quiz: { createdByTeacherId: userId },  // PascalCase
  },
  select: {
    id: true,
    Quiz: {  // PascalCase
      select: {
        id: true,
        title: true,
      },
    },
    _count: {
      select: {
        Attempt: true,  // PascalCase
      },
    },
  },
});

// ✅ ĐÚNG - API response
return NextResponse.json({
  sessions: activeSessions.map(s => ({
    id: s.id,
    quiz: s.Quiz,  // Map to lowercase
    attemptCount: s._count.Attempt,
  })),
});
```

## Tài liệu tham khảo

- [Prisma Relations Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

