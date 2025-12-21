# Authorization System Review

## 📊 Tổng quan hiện tại

### ✅ Đã có

1. **Authentication Layer**
   - `requireUser()` - Check user đã login
   - Support DEV_BYPASS_AUTH mode
   - Return `userId` và `devRole` (nếu có)

2. **Classroom Authorization**
   - `requireTeacherInClassroom()` - Check teacher/TA trong classroom
   - Check membership status = 'active'
   - Check roleInClass = 'teacher' | 'ta'

3. **Pool Authorization**
   - `requirePoolPermission()` - Check quyền trên pool
   - Support permission hierarchy: `view` < `use` < `edit`
   - Check owner vs shared permissions

4. **Resource Ownership Checks**
   - Manual checks: `quiz.createdByTeacherId === userId`
   - Manual checks: `pool.ownerTeacherId === userId`
   - Manual checks: `classroom.ownerTeacherId === userId`

---

## ❌ Thiếu sót và vấn đề

### 1. **System Role Checks** ❌ (Quan trọng)

**Vấn đề:**
- Không có function `requireTeacher()` để check system role
- Không có function `requireStudent()` để check system role
- Phải check manual trong mỗi route:
  ```ts
  const userRoles = await prisma.userRole.findMany({ where: { userId } });
  const hasTeacherRole = userRoles.some(r => r.role === 'teacher');
  ```

**Đề xuất:**
```ts
// server/authz.ts
export async function requireTeacher(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });
  if (!userRoles.some(r => r.role === 'teacher')) {
    throw new Error('FORBIDDEN: Teacher role required');
  }
}

export async function requireStudent(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });
  if (!userRoles.some(r => r.role === 'student')) {
    throw new Error('FORBIDDEN: Student role required');
  }
}

// Helper để get role
export async function getUserRole(userId: string, devRole?: 'teacher' | 'student') {
  if (devRole) {
    return devRole;
  }
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { role: true },
  });
  return userRoles.some(r => r.role === 'teacher') ? 'teacher' : 'student';
}
```

---

### 2. **Route-level Protection** ❌ (Quan trọng)

**Vấn đề:**
- Teacher-only routes không có protection:
  - `/api/quizzes` - Student có thể gọi
  - `/api/quizzes/[quizId]` - Student có thể gọi
  - `/api/pools` - Student có thể gọi
  - `/api/pools/[poolId]` - Student có thể gọi
- Page-level không có protection:
  - `/dashboard/quizzes` - Student có thể truy cập
  - `/dashboard/question-bank` - Student có thể truy cập

**Đề xuất:**

#### 2.1. API Route Protection
```ts
// api/quizzes/route.ts
export async function POST(req: Request) {
  const { userId } = await requireUser();
  await requireTeacher(userId); // ← Thêm check
  
  // ... rest of handler
}
```

#### 2.2. Page-level Protection
```ts
// app/[locale]/(auth)/dashboard/quizzes/page.tsx
export default async function QuizzesPage() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole);
  
  if (role !== 'teacher') {
    redirect('/dashboard');
  }
  
  // ... rest of page
}
```

---

### 3. **Inconsistent Authorization Patterns** ⚠️

**Vấn đề:**
- Một số routes check `createdByTeacherId` manually
- Một số routes không check gì cả
- Không có consistent pattern

**Ví dụ:**

```ts
// ✅ Good: Có check
// api/quizzes/[quizId]/route.ts
if (quiz.createdByTeacherId !== userId) {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}

// ❌ Bad: Không có check
// api/quizzes/route.ts - GET handler
// Student có thể list tất cả quizzes của teacher khác?
```

**Đề xuất:**
- Tạo helper functions:
  ```ts
  export async function requireQuizOwnership(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { createdByTeacherId: true },
    });
    if (!quiz) {
      throw new Error('QUIZ_NOT_FOUND');
    }
    if (quiz.createdByTeacherId !== userId) {
      throw new Error('FORBIDDEN');
    }
    return quiz;
  }
  
  export async function requirePoolOwnership(userId: string, poolId: string) {
    const pool = await prisma.questionPool.findUnique({
      where: { id: poolId },
      select: { ownerTeacherId: true },
    });
    if (!pool) {
      throw new Error('POOL_NOT_FOUND');
    }
    if (pool.ownerTeacherId !== userId) {
      throw new Error('FORBIDDEN');
    }
    return pool;
  }
  ```

---

### 4. **Error Handling** ⚠️

**Vấn đề:**
- Một số routes throw `Error` (sẽ crash)
- Một số routes return `NextResponse.json({ error: '...' })`
- Không consistent

**Đề xuất:**
```ts
// Tạo custom error classes
export class AuthorizationError extends Error {
  constructor(
    public code: string,
    public statusCode: number = 403,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthorizationError';
  }
}

// Usage
export async function requireTeacher(userId: string) {
  // ...
  throw new AuthorizationError('FORBIDDEN', 403, 'Teacher role required');
}

// In route handler
try {
  await requireTeacher(userId);
} catch (error) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.code },
      { status: error.statusCode },
    );
  }
  throw error;
}
```

---

### 5. **Session Authorization** ⚠️

**Vấn đề:**
- Session join: Check classroom membership nhưng không check session status
- Session start/end: Check quiz ownership nhưng không check session ownership
- Student có thể start/end session của teacher khác? (nếu biết sessionId)

**Đề xuất:**
```ts
export async function requireSessionAccess(
  userId: string,
  sessionId: string,
  requiredRole: 'teacher' | 'student',
) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      quiz: {
        select: {
          createdByTeacherId: true,
          classroom: {
            select: {
              id: true,
              memberships: {
                where: { userId, status: 'active' },
                select: { roleInClass: true },
              },
            },
          },
        },
      },
    },
  });
  
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  
  if (requiredRole === 'teacher') {
    if (session.quiz.createdByTeacherId !== userId) {
      throw new Error('FORBIDDEN');
    }
  } else {
    // Student: check membership
    const membership = session.quiz.classroom?.memberships?.[0];
    if (!membership) {
      throw new Error('FORBIDDEN');
    }
  }
  
  return session;
}
```

---

### 6. **Attempt Authorization** ⚠️

**Vấn đề:**
- Student có thể access attempt của student khác?
- Teacher có thể access attempt của student trong class?

**Đề xuất:**
```ts
export async function requireAttemptAccess(
  userId: string,
  attemptId: string,
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      session: {
        select: {
          quiz: {
            select: {
              createdByTeacherId: true,
              classroom: {
                select: {
                  id: true,
                  memberships: {
                    where: { userId, status: 'active' },
                    select: { roleInClass: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!attempt) {
    throw new Error('ATTEMPT_NOT_FOUND');
  }
  
  // Student: chỉ access attempt của chính mình
  if (attempt.studentId === userId) {
    return attempt;
  }
  
  // Teacher: check membership
  const membership = attempt.session.quiz.classroom?.memberships?.[0];
  if (membership && (membership.roleInClass === 'teacher' || membership.roleInClass === 'ta')) {
    return attempt;
  }
  
  throw new Error('FORBIDDEN');
}
```

---

## 🎯 Đề xuất cải thiện

### Priority 1: High (Làm ngay)

1. **Thêm System Role Checks**
   - `requireTeacher(userId)`
   - `requireStudent(userId)`
   - `getUserRole(userId, devRole?)`

2. **Route-level Protection**
   - Thêm `requireTeacher()` vào teacher-only API routes
   - Thêm role check vào teacher-only pages
   - Redirect student khỏi teacher-only pages

3. **Consistent Error Handling**
   - Tạo `AuthorizationError` class
   - Standardize error responses

### Priority 2: Medium (Làm sau)

4. **Resource Ownership Helpers**
   - `requireQuizOwnership(userId, quizId)`
   - `requirePoolOwnership(userId, poolId)`
   - `requireClassroomOwnership(userId, classroomId)`

5. **Session & Attempt Authorization**
   - `requireSessionAccess(userId, sessionId, role)`
   - `requireAttemptAccess(userId, attemptId)`

6. **Authorization Middleware**
   - Tạo middleware để check role trước khi vào route
   - Reduce boilerplate code

### Priority 3: Low (Nice to have)

7. **Permission Matrix Documentation**
   - Document tất cả permissions
   - Create permission matrix table

8. **Authorization Testing**
   - Unit tests cho authorization functions
   - Integration tests cho protected routes

---

## 📝 Implementation Checklist

### Phase 1: Core Authorization Functions
- [ ] Add `requireTeacher(userId)` to `authz.ts`
- [ ] Add `requireStudent(userId)` to `authz.ts`
- [ ] Add `getUserRole(userId, devRole?)` to `authz.ts`
- [ ] Add `AuthorizationError` class

### Phase 2: API Route Protection
- [ ] Add `requireTeacher()` to `/api/quizzes` (POST)
- [ ] Add `requireTeacher()` to `/api/quizzes/[quizId]` (GET, PATCH)
- [ ] Add `requireTeacher()` to `/api/pools` (POST)
- [ ] Add `requireTeacher()` to `/api/pools/[poolId]` (PATCH, DELETE)
- [ ] Add `requireTeacher()` to `/api/classes` (POST)
- [ ] Review và fix tất cả teacher-only routes

### Phase 3: Page-level Protection
- [ ] Add role check to `/dashboard/quizzes/page.tsx`
- [ ] Add role check to `/dashboard/quizzes/[quizId]/page.tsx`
- [ ] Add role check to `/dashboard/question-bank/page.tsx`
- [ ] Add role check to `/dashboard/question-bank/[poolId]/page.tsx`
- [ ] Add role check to `/dashboard/classes` (POST action)

### Phase 4: Resource Ownership Helpers
- [ ] Add `requireQuizOwnership(userId, quizId)`
- [ ] Add `requirePoolOwnership(userId, poolId)`
- [ ] Add `requireClassroomOwnership(userId, classroomId)`
- [ ] Refactor existing routes to use helpers

### Phase 5: Session & Attempt Authorization
- [ ] Add `requireSessionAccess(userId, sessionId, role)`
- [ ] Add `requireAttemptAccess(userId, attemptId)`
- [ ] Update session routes
- [ ] Update attempt routes

---

## ✅ Kết luận

**Hiện tại: 5/10** - Có cơ bản nhưng thiếu consistency và coverage

**Vấn đề chính:**
1. ❌ Thiếu system role checks
2. ❌ Thiếu route-level protection
3. ⚠️ Inconsistent authorization patterns
4. ⚠️ Thiếu resource ownership helpers
5. ⚠️ Session/Attempt authorization chưa đầy đủ

**Sau khi implement: 8/10** - Production-ready authorization system

**Timeline ước tính:**
- Phase 1: 1-2 giờ
- Phase 2: 2-3 giờ
- Phase 3: 1-2 giờ
- Phase 4: 2-3 giờ
- Phase 5: 2-3 giờ
- **Total: 8-13 giờ**

