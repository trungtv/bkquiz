# 📐 PRISMA SCHEMA NAMING CONVENTION (TEAM STANDARD)

Tài liệu này định nghĩa **naming convention chuẩn** cho Prisma schema trong dự án BKquiz. Tuân thủ guideline này giúp:
- Code dễ đọc, dễ maintain
- Giảm cognitive load cho developers
- Đảm bảo consistency across codebase
- Tương thích tốt với TypeScript và Prisma Client

---

## 1. Model Naming

### ✅ Rule

- **PascalCase**
- **Danh từ số ít**
- Đại diện cho **domain entity**

```prisma
model User {}
model QuizSession {}
model Attempt {}
model QuestionPool {}
model Classroom {}
```

### ❌ Không làm

```prisma
model users {}              // ❌ Số nhiều
model quiz_session {}       // ❌ snake_case
model Quiz_Session {}      // ❌ Underscore
```

---

## 2. Field Naming

### ✅ Rule

- **camelCase**
- Rõ nghĩa, không viết tắt
- Thời gian dùng suffix `At`

```prisma
model Attempt {
  id              String
  userId          String
  quizSessionId   String
  status          AttemptStatus
  createdAt       DateTime @default(now())
  updatedAt       DateTime
  submittedAt     DateTime?
  deletedAt       DateTime?
  nextDueAt       DateTime?
  lastVerifiedAt  DateTime?
}
```

### ❌ Không làm

```prisma
created_at       // ❌ snake_case
created          // ❌ Thiếu suffix At
updAt            // ❌ Viết tắt
last_verified_at // ❌ snake_case
```

---

## 3. Relation Field Naming (RẤT QUAN TRỌNG)

### ✅ Rule

- **camelCase**
- **Số ít** cho `@relation` đơn (one-to-one, many-to-one)
- **Số nhiều** cho array relation (one-to-many, many-to-many)
- **Tên có nghĩa**, không trùng model name
- Ưu tiên tên mô tả hơn là tên model

```prisma
model Attempt {
  user          User              // ✅ Số ít, tên có nghĩa
  quizSession   QuizSession       // ✅ Số ít, tên có nghĩa
  answers       Answer[]           // ✅ Số nhiều, tên có nghĩa
  checkpointLogs CheckpointLog[]  // ✅ Số nhiều, tên có nghĩa
}

model QuizSession {
  quiz          Quiz              // ✅ Số ít
  classroom     Classroom         // ✅ Số ít
  attempts      Attempt[]         // ✅ Số nhiều
  questionSnapshots SessionQuestionSnapshot[]  // ✅ Số nhiều
}

model User {
  ownedClassrooms Classroom[]     // ✅ Số nhiều, có prefix mô tả
  memberships     ClassMembership[]  // ✅ Số nhiều
  attempts        Attempt[]       // ✅ Số nhiều
}
```

### ❌ Không làm

```prisma
model Attempt {
  User          User              // ❌ PascalCase
  Answer        Answer[]          // ❌ PascalCase
  QuizSession   QuizSession       // ❌ PascalCase, trùng model name
  User          User               // ❌ Không có nghĩa
}
```

### 📝 Lưu ý đặc biệt

- **Nested relation**: Dùng tên mô tả khi có nhiều relations cùng type
  ```prisma
  model User {
    ownedClassrooms Classroom[] @relation("ClassroomOwner")  // ✅ Có prefix
    memberships     ClassMembership[]                        // ✅ Tên khác
  }
  ```

---

## 4. Foreign Key Field

### ✅ Rule

- Pattern: `{targetModel}Id` (bỏ "Model" nếu model name đã rõ)
- **camelCase**
- Luôn có `@relation` tương ứng

```prisma
model Attempt {
  userId          String
  quizSessionId   String
  sessionId       String  // Nếu model là QuizSession, dùng quizSessionId
}

model Answer {
  attemptId         String
  sessionQuestionId String
}

model ClassMembership {
  classroomId String
  userId      String
}
```

### ❌ Không làm

```prisma
user_id          // ❌ snake_case
userIdFK         // ❌ Thừa suffix
attempt          // ❌ Thiếu Id
```

---

## 5. Enum Naming

### Enum Name

- **PascalCase**
- Danh từ / trạng thái

```prisma
enum QuizStatus {}
enum AttemptStatus {}
enum QuizSessionStatus {}
enum ClassroomRole {}
enum MembershipStatus {}
enum PoolVisibility {}
enum QuestionType {}
```

### Enum Value

#### ✅ Option A – lowercase (Khuyến nghị - gần DB, dễ đọc)

```prisma
enum QuizStatus {
  draft
  published
  archived
}

enum AttemptStatus {
  active
  submitted
  locked
}

enum QuizSessionStatus {
  lobby
  active
  ended
}
```

#### ✅ Option B – UPPER_CASE (Nếu team prefer)

```prisma
enum QuizStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

👉 **Team chọn 1 style, không mix trong cùng project**

---

## 6. Database Naming (qua `@map` / `@@map`)

### ✅ Rule

- **Prisma schema**: camelCase (đẹp, TypeScript-friendly)
- **Database**: snake_case (SQL convention)
- Luôn map để tách biệt

```prisma
model Account {
  id                String  @id
  userId            String
  refreshToken      String? @map("refresh_token")
  accessToken       String? @map("access_token")
  expiresAt         Int?    @map("expires_at")
  tokenType         String? @map("token_type")

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model ClassMembership {
  classroomId String @map("classroom_id")
  userId      String @map("user_id")
  roleInClass ClassroomRole @default(student) @map("role_in_class")
  joinedAt    DateTime @default(now()) @map("joined_at")

  @@id([classroomId, userId])
  @@map("class_memberships")
}
```

👉 **DB được quyền xấu, Prisma phải đẹp**

---

## 7. Composite Key & Index

### Composite Primary Key

```prisma
model Answer {
  attemptId         String
  sessionQuestionId String

  @@id([attemptId, sessionQuestionId])
}

model ClassMembership {
  classroomId String
  userId      String

  @@id([classroomId, userId])
}
```

### Unique Constraint

```prisma
model Account {
  provider          String
  providerAccountId String

  @@unique([provider, providerAccountId])
}

model Attempt {
  sessionId String
  userId    String

  @@unique([sessionId, userId])
}
```

### Index

- **Foreign keys**: Luôn có index
- **Fields filter nhiều**: Thêm index
- **Fields sort nhiều**: Thêm index
- **Composite index**: Khi query thường filter/sort theo nhiều fields

```prisma
model Attempt {
  userId        String
  sessionId     String
  createdAt     DateTime

  @@index([userId])
  @@index([sessionId])
  @@index([sessionId, createdAt])  // Composite cho query phức tạp
}

model CheckpointLog {
  attemptId String
  createdAt DateTime

  @@index([attemptId, createdAt])  // Query log theo attempt + time
}
```

---

## 8. Timestamps Standard

### Bắt buộc có (nếu là core entity)

```prisma
model User {
  createdAt DateTime @default(now())
  updatedAt DateTime
}

model Quiz {
  createdAt DateTime @default(now())
  updatedAt DateTime
}

model QuizSession {
  createdAt DateTime @default(now())
  updatedAt DateTime
}
```

### Soft Delete (nếu cần)

```prisma
model Question {
  deletedAt DateTime?
}

model Option {
  deletedAt DateTime?
}
```

### Lưu ý

- `createdAt`: Luôn có `@default(now())`
- `updatedAt`: Không có `@default`, Prisma tự update qua `@updatedAt` (nếu schema hỗ trợ) hoặc manual update
- `deletedAt`: Nullable, dùng cho soft delete

---

## 9. JSON Field

### ✅ Rule

- Chỉ dùng khi:
  - Dynamic config (settings, filters)
  - Snapshot data
  - Metadata không cần query
- **Luôn có default**

```prisma
model Quiz {
  settings Json @default("{}")  // Dynamic quiz settings
}

model QuizRule {
  filters Json @default("{}")  // Pool filters, tag filters
}

model Answer {
  selected Json @default("[]")  // Selected option IDs
}
```

### ❌ Không dùng JSON cho

- Relational data (dùng relation thay vì)
- Data cần query/filter (dùng columns thay vì)
- Data cần validation chặt (dùng typed fields thay vì)

---

## 10. Naming cho Snapshot / Log / Join Table

### Snapshot Models

- Pattern: `{Context}{Entity}Snapshot`
- Mô tả rõ context và entity

```prisma
model SessionQuestionSnapshot {
  // Snapshot của Question trong QuizSession
}

model SessionOptionSnapshot {
  // Snapshot của Option trong SessionQuestionSnapshot
}
```

### Log / Event Models

- Pattern: `{Entity}Log` hoặc `{Event}Log`
- Mô tả rõ mục đích

```prisma
model CheckpointLog {
  // Log các checkpoint events trong Attempt
}

model AuditLog {
  // Log các thay đổi trong system
}
```

### Join Tables

- Pattern: `{Entity1}{Entity2}` hoặc `{Entity}Membership`
- Mô tả relationship

```prisma
model QuestionTag {
  // Join table: Question <-> Tag
}

model ClassMembership {
  // Join table: Classroom <-> User (với thêm metadata)
}

model UserRole {
  // Join table: User <-> SystemRole
}
```

---

## 11. Auth / NextAuth Compatible Rule

- Giữ đúng field logic của NextAuth
- Nhưng vẫn camelCase + map sang snake_case trong DB

```prisma
model Account {
  id                String  @id
  userId            String
  type              String
  provider          String
  providerAccountId String @map("provider_account_id")
  refreshToken      String? @map("refresh_token")
  accessToken       String? @map("access_token")
  expiresAt         Int?    @map("expires_at")
  tokenType         String? @map("token_type")
  scope             String?
  idToken           String? @map("id_token")
  sessionState      String? @map("session_state")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id
  sessionToken String   @unique @map("session_token")
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## 12. Prisma Client DX Checklist

Trước khi merge schema, tự hỏi:

- [ ] `prisma.user.findMany()` có **đọc như tiếng Anh không?**
- [ ] Access field có camelCase không? `user.createdAt` thay vì `user.created_at`
- [ ] Relation name có **tự nhiên khi include/select** không?
  ```typescript
  prisma.classMembership.findMany({
    include: { classroom: true }  // ✅ Tự nhiên
  })
  ```
- [ ] TypeScript autocomplete có work tốt không?
- [ ] Code có dễ đọc không? `attempt.quizSession.status` thay vì `attempt.QuizSession.Status`

Nếu câu trả lời là **YES** → schema OK ✅

---

## 13. Quick Example (Chuẩn hoàn chỉnh)

```prisma
model Attempt {
  id              String        @id
  sessionId       String
  userId          String
  status          AttemptStatus @default(active)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime
  nextDueAt       DateTime?
  lastVerifiedAt  DateTime?
  submittedAt     DateTime?
  score           Float?

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizSession     QuizSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  answers         Answer[]
  checkpointLogs CheckpointLog[]

  @@unique([sessionId, userId])
  @@index([userId])
  @@index([sessionId])
}

model Answer {
  attemptId         String
  sessionQuestionId String
  selected          Json     @default("[]")
  updatedAt         DateTime

  attempt         Attempt                 @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  sessionQuestion SessionQuestionSnapshot @relation(fields: [sessionQuestionId], references: [id], onDelete: Cascade)

  @@id([attemptId, sessionQuestionId])
  @@index([attemptId])
}
```

---

## 14. Common Patterns trong BKquiz

### Quiz & Session Pattern

```prisma
model Quiz {
  id                 String     @id
  title              String
  createdByTeacherId String
  status             QuizStatus @default(draft)
  settings           Json       @default("{}")
  createdAt          DateTime   @default(now())
  updatedAt          DateTime

  createdBy         User       @relation(fields: [createdByTeacherId], references: [id])
  rules             QuizRule[]
  sessions          QuizSession[]

  @@index([createdByTeacherId])
}

model QuizSession {
  id              String            @id
  quizId          String
  classroomId     String
  status          QuizSessionStatus @default(lobby)
  startedAt       DateTime?
  endedAt         DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime

  quiz        Quiz      @relation(fields: [quizId], references: [id], onDelete: Cascade)
  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  attempts    Attempt[]

  @@index([quizId])
  @@index([classroomId])
}
```

### Classroom & Membership Pattern

```prisma
model Classroom {
  id             String   @id
  name           String
  classCode      String   @unique
  ownerTeacherId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime

  ownerTeacher  User              @relation(fields: [ownerTeacherId], references: [id])
  memberships   ClassMembership[]
  sessions      QuizSession[]

  @@index([ownerTeacherId])
}

model ClassMembership {
  classroomId String
  userId      String
  roleInClass ClassroomRole    @default(student)
  status      MembershipStatus @default(active)
  joinedAt    DateTime         @default(now())

  classroom Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([classroomId, userId])
  @@index([classroomId])
  @@index([userId])
}
```

---

## 🧠 Lời khuyên cuối (Rất quan trọng)

> **Schema là API nền tảng cho toàn bộ codebase.**
> Đẹp ở đây không phải aesthetic — mà là **giảm cognitive load cho dev**.

Với hệ thống BKquiz:

- Quiz management
- Session & anti-cheat
- Classroom & membership
- Auth & authorization

👉 **Giữ convention chặt = tiết kiệm hàng trăm giờ maintain**

### Best Practices

1. **Consistency > Perfection**: Thà không perfect nhưng consistent hơn là perfect nhưng inconsistent
2. **Readability > Brevity**: Code đọc được quan trọng hơn code ngắn
3. **Team Agreement**: Mọi người phải đồng ý và follow cùng 1 convention
4. **Documentation**: Update doc này khi có thay đổi convention

---

## 📚 References

- [Prisma Naming Conventions](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#naming-conventions)
- [TypeScript Naming Conventions](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#naming)
- [Database Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)

---

**Last Updated**: 2025-12-21  
**Maintained by**: BKquiz Team

