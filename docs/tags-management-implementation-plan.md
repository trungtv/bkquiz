# 📋 Kế hoạch triển khai Tags Management - Step by Step

## Tổng quan

Kế hoạch này chia nhỏ việc triển khai tính năng tags cho Class, Quiz và Pool thành các bước cụ thể, có thể test và verify từng bước.

---

## Phase 1: Database Schema & Migration

### Step 1.1: Cập nhật Prisma Schema

**File**: `bkquiz-web/prisma/schema.prisma`

**Tasks**:
1. Thêm 3 junction table models:
   - `ClassroomTag`
   - `QuizTag`
   - `QuestionPoolTag`

2. Cập nhật các model hiện có:
   - Thêm relation `tags` vào `Classroom`
   - Thêm relation `tags` vào `Quiz`
   - Thêm relation `tags` vào `QuestionPool`
   - Thêm relations vào `Tag` model

**Code changes**:
```prisma
// Thêm vào cuối file, trước các enums

model ClassroomTag {
  classroomId String
  tagId       String
  createdAt   DateTime @default(now())
  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  tag         Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([classroomId, tagId])
  @@index([tagId, classroomId])
}

model QuizTag {
  quizId    String
  tagId     String
  createdAt DateTime @default(now())
  quiz      Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([quizId, tagId])
  @@index([tagId, quizId])
}

model QuestionPoolTag {
  poolId    String
  tagId     String
  createdAt DateTime @default(now())
  pool      QuestionPool @relation(fields: [poolId], references: [id], onDelete: Cascade)
  tag       Tag          @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([poolId, tagId])
  @@index([tagId, poolId])
}

// Cập nhật model Classroom
model Classroom {
  // ... existing fields ...
  tags ClassroomTag[]
}

// Cập nhật model Quiz
model Quiz {
  // ... existing fields ...
  tags QuizTag[]
}

// Cập nhật model QuestionPool
model QuestionPool {
  // ... existing fields ...
  tags QuestionPoolTag[]
}

// Cập nhật model Tag
model Tag {
  // ... existing fields ...
  classroomTags  ClassroomTag[]
  quizTags       QuizTag[]
  poolTags       QuestionPoolTag[]
}
```

**Verification**:
```bash
cd bkquiz-web
npm run prisma:generate
# Kiểm tra không có lỗi syntax
```

---

### Step 1.2: Tạo Migration

**Command**:
```bash
cd bkquiz-web
npm run prisma:migrate
# Nhập tên migration: add_tags_to_classroom_quiz_pool
```

**Verification**:
1. Kiểm tra migration file được tạo trong `prisma/migrations/`
2. Review SQL migration để đảm bảo đúng
3. Chạy migration:
   ```bash
   npm run prisma:migrate
   ```
4. Verify trong Prisma Studio:
   ```bash
   npx prisma studio
   ```
   - Kiểm tra các bảng mới đã được tạo
   - Kiểm tra indexes đã được tạo

---

## Phase 2: Backend API - Core Functions

### Step 2.1: Tạo Utility Functions

**File**: `bkquiz-web/src/server/tags.ts` (mới)

**Tasks**:
1. Tạo helper function để parse và normalize tags từ comma-separated string
2. Tạo helper function để upsert tags
3. Tạo helper function để validate tags (max 5 tags)

**Code**:
```typescript
import { prisma } from '@/server/prisma';

// Normalize tag name (giống như trong codebase hiện tại)
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Parse comma-separated tags string
export function parseTagsInput(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 5); // Giới hạn tối đa 5 tags
}

// Upsert tags và trả về tag IDs
export async function upsertTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];
  
  for (const name of tagNames) {
    const normalizedName = normalizeTagName(name);
    
    const tag = await prisma.tag.upsert({
      where: { normalizedName },
      update: { name }, // Update name nếu đã tồn tại
      create: { name, normalizedName },
      select: { id: true },
    });
    
    tagIds.push(tag.id);
  }
  
  return tagIds;
}

// Validate tags (max 5)
export function validateTagsCount(tags: string[]): { valid: boolean; error?: string } {
  if (tags.length > 5) {
    return { valid: false, error: 'Tối đa 5 tags' };
  }
  return { valid: true };
}
```

**Verification**:
- Tạo test file hoặc test thủ công trong console
- Verify normalize function hoạt động đúng
- Verify parse function giới hạn 5 tags

---

### Step 2.2: API - Get Tags của Entity

**Files**:
- `bkquiz-web/src/app/api/classes/[classId]/tags/route.ts` (mới)
- `bkquiz-web/src/app/api/quizzes/[quizId]/tags/route.ts` (mới)
- `bkquiz-web/src/app/api/pools/[poolId]/tags/route.ts` (mới)

**Task**: Implement GET endpoint cho mỗi entity type

**Example cho Classroom**:
```typescript
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;

  // Check classroom exists và user có quyền
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    select: {
      id: true,
      ownerTeacherId: true,
      memberships: {
        where: {
          userId,
          status: 'active',
          roleInClass: { in: ['teacher', 'ta'] },
        },
        select: { roleInClass: true },
      },
    },
  });

  if (!classroom) {
    return NextResponse.json({ error: 'CLASSROOM_NOT_FOUND' }, { status: 404 });
  }

  const isOwner = classroom.ownerTeacherId === userId;
  const isMember = classroom.memberships.length > 0;

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Get tags
  const tags = await prisma.classroomTag.findMany({
    where: { classroomId: classId },
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    tags: tags.map(t => t.tag),
  });
}
```

**Verification**:
- Test với Postman/curl hoặc browser
- Test authorization (403 khi không có quyền)
- Test với classroom không có tags (trả về empty array)

---

### Step 2.3: API - Update Tags của Entity

**Task**: Implement PATCH endpoint cho mỗi entity type

**Example cho Classroom**:
```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { parseTagsInput, upsertTags, validateTagsCount } from '@/server/tags';

const UpdateTagsSchema = z.object({
  tags: z.string(), // Comma-separated string
});

export async function PATCH(req: Request, ctx: { params: Promise<{ classId: string }> }) {
  const { userId } = await requireUser();
  const { classId } = await ctx.params;
  const body = UpdateTagsSchema.parse(await req.json());

  // Check classroom exists và user có quyền (giống GET)
  // ... (copy từ GET endpoint)

  // Parse và validate tags
  const tagNames = parseTagsInput(body.tags);
  const validation = validateTagsCount(tagNames);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Upsert tags và lấy tag IDs
  const tagIds = await upsertTags(tagNames);

  // Update tags trong transaction
  await prisma.$transaction(async (tx) => {
    // Delete old tags
    await tx.classroomTag.deleteMany({
      where: { classroomId: classId },
    });

    // Create new tags
    await tx.classroomTag.createMany({
      data: tagIds.map(tagId => ({
        classroomId: classId,
        tagId,
      })),
    });
  });

  // Return updated tags
  const tags = await prisma.classroomTag.findMany({
    where: { classroomId: classId },
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    tags: tags.map(t => t.tag),
  });
}
```

**Verification**:
- Test update tags (thêm, xóa, sửa)
- Test validation (max 5 tags)
- Test với empty string (xóa tất cả tags)
- Test authorization

---

### Step 2.4: Mở rộng GET /api/tags

**File**: `bkquiz-web/src/app/api/tags/route.ts`

**Task**: Thêm counts cho classroom, quiz, pool tags

**Code changes**:
```typescript
const tags = await prisma.tag.findMany({
  // ... existing where, orderBy, take ...
  select: {
    id: true,
    name: true,
    normalizedName: true,
    _count: {
      select: {
        questionTags: true,
        classroomTags: true,  // NEW
        quizTags: true,       // NEW
        poolTags: true,       // NEW
      },
    },
  },
});

return NextResponse.json({
  tags: tags.map(t => ({
    id: t.id,
    name: t.name,
    normalizedName: t.normalizedName,
    questionCount: t._count.questionTags,
    classroomCount: t._count.classroomTags,  // NEW
    quizCount: t._count.quizTags,            // NEW
    poolCount: t._count.poolTags,            // NEW
  })),
});
```

**Verification**:
- Test API trả về đúng counts
- Test với tags chưa được gắn vào entities nào

---

## Phase 3: Backend API - Filter Support

### Step 3.1: Filter Classes by Tags

**File**: `bkquiz-web/src/app/api/classes/route.ts`

**Task**: Thêm query param `tags` để filter

**Code changes**:
```typescript
export async function GET(req: Request) {
  const { userId } = await requireUser();
  const url = new URL(req.url);
  const tagsParam = url.searchParams.get('tags');
  
  // Parse tags filter
  const filterTagNames = tagsParam
    ? tagsParam.split(',').map(t => normalizeTagName(t.trim())).filter(Boolean)
    : [];

  // Build where clause
  let whereClause: any = {
    // ... existing where conditions ...
  };

  // Add tags filter nếu có
  if (filterTagNames.length > 0) {
    // Find tag IDs
    const tags = await prisma.tag.findMany({
      where: { normalizedName: { in: filterTagNames } },
      select: { id: true },
    });
    
    const tagIds = tags.map(t => t.id);
    
    if (tagIds.length > 0) {
      // Filter: classroom phải có TẤT CẢ tags (AND logic)
      whereClause.tags = {
        every: {
          tagId: { in: tagIds },
        },
      };
      
      // Hoặc dùng cách này (chính xác hơn):
      // Lấy classroomIds có tất cả tags
      const classroomsWithAllTags = await prisma.classroomTag.groupBy({
        by: ['classroomId'],
        where: { tagId: { in: tagIds } },
        having: {
          tagId: {
            _count: {
              equals: tagIds.length,
            },
          },
        },
      });
      
      const classroomIds = classroomsWithAllTags.map(c => c.classroomId);
      whereClause.id = { in: classroomIds };
    } else {
      // Không tìm thấy tags nào → return empty
      return NextResponse.json({ classes: [] });
    }
  }

  const classes = await prisma.classroom.findMany({
    where: whereClause,
    // ... rest of query ...
    include: {
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              normalizedName: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    classes: classes.map(c => ({
      // ... existing fields ...
      tags: c.tags.map(t => t.tag),
    })),
  });
}
```

**Verification**:
- Test filter với 1 tag
- Test filter với nhiều tags (AND logic)
- Test filter với tags không tồn tại (empty result)
- Test không có filter (trả về tất cả như cũ)

---

### Step 3.2: Filter Quizzes by Tags

**File**: `bkquiz-web/src/app/api/quizzes/route.ts`

**Task**: Tương tự như classes, thêm tags filter

**Verification**: Tương tự Step 3.1

---

### Step 3.3: Filter Pools by Tags

**File**: `bkquiz-web/src/app/api/pools/route.ts`

**Task**: Tương tự như classes, thêm tags filter

**Verification**: Tương tự Step 3.1

---

## Phase 4: Frontend - UI Components

### Step 4.1: Tạo TagInput Component

**File**: `bkquiz-web/src/components/ui/TagInput.tsx` (mới)

**Task**: Component để input và hiển thị tags

**Code structure**:
```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TagInputProps {
  value: string; // Comma-separated string
  onChange: (value: string) => void;
  onSave?: () => void;
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  showSaveButton?: boolean;
}

export function TagInput({
  value,
  onChange,
  onSave,
  tags = [],
  placeholder = 'tag1, tag2, tag3...',
  maxLength = 200,
  disabled = false,
  showSaveButton = false,
}: TagInputProps) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
      />
      
      {/* Hiển thị tags hiện có */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag.id} variant="neutral" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      
      <p className="text-xs text-text-muted">
        Tối đa 5 tags. Ví dụ: 2025, IT, HCM
      </p>
      
      {showSaveButton && onSave && (
        <Button variant="primary" size="sm" onClick={onSave} disabled={disabled}>
          Lưu tags
        </Button>
      )}
    </div>
  );
}
```

**Verification**:
- Test input và onChange
- Test hiển thị tags
- Test disabled state

---

### Step 4.2: Tạo TagFilter Component

**File**: `bkquiz-web/src/components/ui/TagFilter.tsx` (mới)

**Task**: Component để filter trong list pages

**Code structure**:
```tsx
'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface TagFilterProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function TagFilter({
  value,
  onChange,
  onClear,
  placeholder = 'Filter by tags (comma-separated): tag1, tag2...',
}: TagFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {value && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
```

**Verification**:
- Test filter input
- Test clear button
- Test onChange

---

## Phase 5: Frontend - Detail Pages

### Step 5.1: Classroom Detail - Tags Section

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/classes/[classId]/TeacherClassDetail.tsx`

**Tasks**:
1. Thêm state cho tags input và tags data
2. Load tags khi component mount
3. Thêm UI section với TagInput component
4. Implement save handler

**Code changes**:
```tsx
const [tagsInput, setTagsInput] = useState('');
const [tags, setTags] = useState<Array<{ id: string; name: string; normalizedName: string }>>([]);
const [tagsBusy, setTagsBusy] = useState(false);

// Load tags
async function loadTags() {
  try {
    const res = await fetch(`/api/classes/${props.classId}/tags`);
    const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }> };
    if (res.ok) {
      setTags(json.tags ?? []);
      setTagsInput(json.tags?.map(t => t.name).join(', ') ?? '');
    }
  } catch (err) {
    console.error('Error loading tags:', err);
  }
}

// Save tags
async function saveTags() {
  setTagsBusy(true);
  try {
    const res = await fetch(`/api/classes/${props.classId}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagsInput }),
    });
    const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
    if (res.ok) {
      setTags(json.tags ?? []);
      // Show success toast
    } else {
      // Show error
    }
  } catch (err) {
    console.error('Error saving tags:', err);
  } finally {
    setTagsBusy(false);
  }
}

useEffect(() => {
  void loadTags();
}, [props.classId]);

// Trong JSX, thêm section:
<Card>
  <div className="space-y-2">
    <label className="text-sm font-medium text-text-heading">
      Tags
    </label>
    <TagInput
      value={tagsInput}
      onChange={setTagsInput}
      onSave={saveTags}
      tags={tags}
      showSaveButton={true}
      disabled={tagsBusy}
    />
  </div>
</Card>
```

**Verification**:
- Test load tags
- Test save tags (thêm, xóa, sửa)
- Test validation (max 5 tags)
- Test error handling

---

### Step 5.2: Quiz Detail - Tags Section

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/quizzes/[quizId]/QuizRulesPanel.tsx`

**Task**: Tương tự Step 5.1, thêm tags section vào Quiz detail

**Verification**: Tương tự Step 5.1

---

### Step 5.3: Pool Detail - Tags Section

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/question-bank/[poolId]/QuestionPoolDetail.tsx`

**Task**: Tương tự Step 5.1, thêm tags section vào Pool detail

**Verification**: Tương tự Step 5.1

---

## Phase 6: Frontend - List Pages với Filter

### Step 6.1: Classes Panel - Tag Filter

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/classes/ClassesPanel.tsx`

**Tasks**:
1. Thêm state cho tag filter
2. Thêm TagFilter component vào UI
3. Update API call để include tags filter
4. Update API response để include tags trong list items
5. Hiển thị tags trong list items (max 5)

**Code changes**:
```tsx
const [tagFilter, setTagFilter] = useState('');

// Update load function
async function load() {
  const url = new URL('/api/classes', window.location.origin);
  if (tagFilter) {
    url.searchParams.set('tags', tagFilter);
  }
  const res = await fetch(url.toString());
  // ... rest of load logic
}

// Trong JSX:
<div className="mb-4">
  <TagFilter
    value={tagFilter}
    onChange={setTagFilter}
    onClear={() => setTagFilter('')}
  />
</div>

// Hiển thị tags trong list items:
<div className="flex flex-wrap gap-1 mt-2">
  {item.tags?.slice(0, 5).map(tag => (
    <Badge key={tag.id} variant="neutral" className="text-xs">
      {tag.name}
    </Badge>
  ))}
  {item.tags && item.tags.length > 5 && (
    <Badge variant="neutral" className="text-xs">
      +{item.tags.length - 5}
    </Badge>
  )}
</div>
```

**Verification**:
- Test filter với 1 tag
- Test filter với nhiều tags (AND logic)
- Test clear filter
- Test hiển thị tags trong list items

---

### Step 6.2: Quizzes Panel - Tag Filter

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/quizzes/QuizzesPanel.tsx`

**Task**: Tương tự Step 6.1

**Verification**: Tương tự Step 6.1

---

### Step 6.3: Question Bank Panel - Tag Filter

**File**: `bkquiz-web/src/app/[locale]/(auth)/dashboard/question-bank/QuestionBankPanel.tsx`

**Task**: Tương tự Step 6.1

**Verification**: Tương tự Step 6.1

---

## Phase 7: Testing & Polish

### Step 7.1: Integration Testing

**Tasks**:
1. Test end-to-end flow:
   - Tạo classroom → gắn tags → filter
   - Tạo quiz → gắn tags → filter
   - Tạo pool → gắn tags → filter

2. Test edge cases:
   - Empty tags
   - Duplicate tags (normalize)
   - Max 5 tags validation
   - Special characters trong tag names
   - Filter với tags không tồn tại

3. Test authorization:
   - Teacher không có quyền không thể update tags
   - Student không thể xem/edit tags

---

### Step 7.2: UI/UX Polish

**Tasks**:
1. Loading states cho tất cả async operations
2. Error messages rõ ràng
3. Success feedback (toast/notification)
4. Responsive design
5. Accessibility (keyboard navigation, screen readers)

---

### Step 7.3: Performance Optimization

**Tasks**:
1. Verify indexes hoạt động tốt
2. Check query performance với nhiều tags
3. Optimize API responses (chỉ select fields cần thiết)
4. Consider caching nếu cần

---

### Step 7.4: Documentation

**Tasks**:
1. Update API documentation
2. Update UI/UX guidelines nếu cần
3. Add comments trong code
4. Update README nếu cần

---

## Checklist tổng thể

### Database
- [ ] Prisma schema updated
- [ ] Migration created và tested
- [ ] Indexes verified

### Backend API
- [ ] Utility functions created
- [ ] GET tags endpoints (3 entities)
- [ ] PATCH tags endpoints (3 entities)
- [ ] GET /api/tags updated với counts
- [ ] Filter support trong list APIs (3 entities)

### Frontend Components
- [ ] TagInput component
- [ ] TagFilter component

### Frontend Pages
- [ ] Classroom detail - tags section
- [ ] Quiz detail - tags section
- [ ] Pool detail - tags section
- [ ] Classes panel - filter
- [ ] Quizzes panel - filter
- [ ] Question bank panel - filter

### Testing & Polish
- [ ] Integration tests
- [ ] Edge cases handled
- [ ] Authorization tested
- [ ] UI/UX polished
- [ ] Performance optimized
- [ ] Documentation updated

---

## Thứ tự ưu tiên

1. **Phase 1-2**: Database và Backend API core (bắt buộc)
2. **Phase 3**: Filter support (quan trọng cho UX)
3. **Phase 4-5**: UI components và detail pages (quan trọng)
4. **Phase 6**: List pages với filter (nice to have)
5. **Phase 7**: Testing & polish (quan trọng trước khi release)

---

## Estimated Time

- **Phase 1**: 1-2 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 1-2 hours
- **Phase 5**: 3-4 hours
- **Phase 6**: 2-3 hours
- **Phase 7**: 2-3 hours

**Total**: ~15-21 hours

---

## Notes

- Mỗi step nên được commit riêng để dễ review và rollback
- Test từng step trước khi chuyển sang step tiếp theo
- Nếu gặp vấn đề, dừng lại và fix trước khi tiếp tục
- Có thể parallelize Phase 5 (3 detail pages) và Phase 6 (3 list pages) nếu có nhiều developers
