# 🏷️ Thiết kế tính năng quản lý Tags cho Class, Quiz và Pool

## 1. Tổng quan

### 1.1 Mục tiêu
Cho phép gắn tags cho các đối tượng:
- **Classroom**: Ví dụ "2025", "IT", "HCM" để phân loại lớp học theo năm, chuyên ngành, địa điểm
- **Quiz**: Ví dụ "midterm", "final", "practice" để phân loại bài kiểm tra
- **QuestionPool**: Ví dụ "basic", "advanced", "chapter1" để phân loại ngân hàng câu hỏi

### 1.2 Use Cases
1. **Filter và tìm kiếm**:
   - Tìm tất cả classes có tag "2025" và "IT"
   - Tìm tất cả quizzes có tag "midterm"
   - Tìm tất cả pools có tag "basic"

2. **Tổ chức và quản lý**:
   - Nhóm các classes theo năm học
   - Phân loại quizzes theo loại kiểm tra
   - Tổ chức pools theo chương/mức độ

3. **Báo cáo và phân tích**:
   - Thống kê số lượng classes/quizzes/pools theo tag
   - Phân tích performance theo nhóm tags

## 2. Database Schema Design

### 2.1 Thêm Junction Tables

```prisma
// Thêm vào schema.prisma

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
```

### 2.2 Cập nhật các Model hiện có

```prisma
model Classroom {
  // ... existing fields ...
  tags ClassroomTag[]
}

model Quiz {
  // ... existing fields ...
  tags QuizTag[]
}

model QuestionPool {
  // ... existing fields ...
  tags QuestionPoolTag[]
}

model Tag {
  // ... existing fields ...
  classroomTags  ClassroomTag[]
  quizTags       QuizTag[]
  poolTags       QuestionPoolTag[]
}
```

### 2.3 Migration Strategy
- Tạo migration mới để thêm 3 junction tables
- Không cần migrate dữ liệu cũ (tags mới sẽ được gắn từ đầu)
- Đảm bảo indexes cho performance khi query

## 3. API Design

### 3.1 Get Tags (đã có, cần mở rộng)

**GET `/api/tags`**
- Query params: `q` (search query), `type` (optional: `question|classroom|quiz|pool|all`)
- Response: List tags với counts cho từng type
- **Limit**: `take: 20` (đủ cho suggestions, không cần pagination)

```typescript
// Response
{
  tags: Array<{
    id: string;
    name: string;
    normalizedName: string;
    questionCount: number;
    classroomCount: number;  // NEW
    quizCount: number;       // NEW
    poolCount: number;       // NEW
  }>
}
```

**Note về Pagination**: 
- API hiện tại đã có `take: 20` - đủ cho autocomplete/suggestions
- Không cần pagination vì:
  - Suggestions chỉ cần top 20 tags phổ biến nhất
  - User có thể search bằng query `q` để filter
  - 20 results là đủ cho dropdown/autocomplete UI

### 3.2 Get Tags của một Entity

**GET `/api/classes/[classId]/tags`**
- Response: `{ tags: Array<{ id, name, normalizedName }> }`

**GET `/api/quizzes/[quizId]/tags`**
- Response: `{ tags: Array<{ id, name, normalizedName }> }`

**GET `/api/pools/[poolId]/tags`**
- Response: `{ tags: Array<{ id, name, normalizedName }> }`

### 3.3 Update Tags của một Entity

**PATCH `/api/classes/[classId]/tags`**
```typescript
// Request body
{
  tags: string[]; // Array of tag names (comma-separated string sẽ được parse thành array)
}

// Response
{
  tags: Array<{ id: string; name: string; normalizedName: string }>
}

// Validation:
// - Tối đa 5 tags
// - Mỗi tag name không được rỗng sau khi trim
// - Tự động normalize tag names
```

**Validation Rules**:
- Tối đa **5 tags** cho mỗi entity
- Mỗi tag name phải có ít nhất 1 ký tự sau khi trim
- Tự động normalize (lowercase, trim, remove special chars)
- Upsert tags (tạo mới nếu chưa có, update name nếu đã có)

**PATCH `/api/quizzes/[quizId]/tags`**
- Tương tự như classes

**PATCH `/api/pools/[poolId]/tags`**
- Tương tự như classes

### 3.4 Authorization
- **Classroom tags**: Chỉ owner teacher hoặc teacher/TA trong classroom
- **Quiz tags**: Chỉ owner teacher của quiz
- **Pool tags**: Chỉ owner teacher hoặc teacher có quyền edit pool

### 3.5 Filter APIs (mở rộng)

**GET `/api/classes?tags=tag1,tag2`**
- Query param: `tags` (comma-separated string)
- Filter logic: **AND** (entity phải có TẤT CẢ tags)
- Parse: Split by comma, trim, normalize từng tag
- Query: `WHERE entityId IN (SELECT entityId FROM EntityTag WHERE tagId IN (...)) GROUP BY entityId HAVING COUNT(DISTINCT tagId) = ?`

**GET `/api/quizzes?tags=tag1,tag2&classroomId=...`**
- Filter quizzes theo tags

**GET `/api/pools?tags=tag1,tag2`**
- Filter pools theo tags

## 4. UI/UX Design

### 4.1 Tag Input Component

**Quyết định**: Giữ comma-separated input như hiện tại (giống pattern trong `QuestionPoolDetail.tsx`)

```tsx
<label className="grid gap-1 text-sm">
  <span className="font-medium text-text-heading">Tags (comma-separated)</span>
  <Input
    value={tagsInput}
    onChange={e => setTagsInput(e.target.value)}
    placeholder="tag1, tag2, tag3..."
    maxLength={200} // Giới hạn độ dài input
  />
  <p className="text-xs text-text-muted">
    Tối đa 5 tags. Ví dụ: 2025, IT, HCM
  </p>
</label>
```

**Features**:
- Comma-separated input (giống như question tags hiện tại)
- Validation: tối đa 5 tags cho mỗi entity
- Tự động normalize tag names khi submit
- Hiển thị tags hiện có dưới dạng badges bên dưới input

### 4.2 Classroom Detail Page

**Vị trí**: Trong header card hoặc settings section

```tsx
<Card>
  <div className="space-y-2">
    <label className="text-sm font-medium text-text-heading">
      Tags
    </label>
    <Input
      value={tagsInput}
      onChange={e => setTagsInput(e.target.value)}
      placeholder="tag1, tag2, tag3..."
      maxLength={200}
    />
    {/* Hiển thị tags hiện có */}
    {classroomTags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {classroomTags.map(tag => (
          <Badge key={tag.id} variant="neutral" className="text-xs">
            {tag.name}
          </Badge>
        ))}
      </div>
    )}
    <p className="text-xs text-text-muted">
      Tối đa 5 tags. Ví dụ: 2025, IT, HCM
    </p>
    <Button 
      variant="primary" 
      size="sm" 
      onClick={handleSaveTags}
      disabled={busy}
    >
      Lưu tags
    </Button>
  </div>
</Card>
```

### 4.3 Quiz Detail Page

**Vị trí**: Trong QuizRulesPanel hoặc settings section

```tsx
<Card>
  <div className="space-y-2">
    <label className="text-sm font-medium text-text-heading">
      Tags (comma-separated)
    </label>
    <Input
      value={tagsInput}
      onChange={e => setTagsInput(e.target.value)}
      placeholder="midterm, 2025, practice..."
      maxLength={200}
    />
    {quizTags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {quizTags.map(tag => (
          <Badge key={tag.id} variant="neutral" className="text-xs">
            {tag.name}
          </Badge>
        ))}
      </div>
    )}
    <p className="text-xs text-text-muted">
      Tối đa 5 tags
    </p>
    <Button 
      variant="primary" 
      size="sm" 
      onClick={handleSaveTags}
      disabled={busy}
    >
      Lưu tags
    </Button>
  </div>
</Card>
```

### 4.4 Question Pool Detail Page

**Vị trí**: Trong header card hoặc settings section

```tsx
<Card>
  <div className="space-y-2">
    <label className="text-sm font-medium text-text-heading">
      Tags (comma-separated)
    </label>
    <Input
      value={tagsInput}
      onChange={e => setTagsInput(e.target.value)}
      placeholder="basic, advanced, chapter1..."
      maxLength={200}
    />
    {poolTags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {poolTags.map(tag => (
          <Badge key={tag.id} variant="neutral" className="text-xs">
            {tag.name}
          </Badge>
        ))}
      </div>
    )}
    <p className="text-xs text-text-muted">
      Tối đa 5 tags
    </p>
    <Button 
      variant="primary" 
      size="sm" 
      onClick={handleSaveTags}
      disabled={busy}
    >
      Lưu tags
    </Button>
  </div>
</Card>
```

### 4.5 Filter UI trong List Pages

**Quyết định**: Filter logic là **AND** (entity phải có TẤT CẢ các tags được chọn)

#### Classes Panel
```tsx
<div className="flex items-center gap-2 mb-4">
  <Input
    value={filterTagsInput}
    onChange={e => setFilterTagsInput(e.target.value)}
    placeholder="Filter by tags (comma-separated): tag1, tag2..."
    className="flex-1"
  />
  {filterTags.length > 0 && (
    <Button variant="ghost" size="sm" onClick={() => {
      setFilterTagsInput('');
      setFilterTags([]);
    }}>
      Clear filters
    </Button>
  )}
</div>
```

**Filter Logic**:
- Parse comma-separated input thành array of normalized tag names
- Query: Entity phải có TẤT CẢ tags trong array (AND logic)
- Ví dụ: `tags=2025,IT` → chỉ hiển thị classes có cả tag "2025" VÀ "IT"

#### Quizzes Panel
- Tương tự, thêm tag filter vào danh sách quizzes

#### Question Bank Panel
- Tương tự, thêm tag filter vào danh sách pools

### 4.6 Tag Display trong List Items

**Quyết định**: Hiển thị tối đa 5 tags, nếu nhiều hơn thì truncate

```tsx
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

**Trong Detail Pages**: Hiển thị tất cả tags (vì đã giới hạn max 5 tags khi input)

## 5. Implementation Plan

### Phase 1: Database & API
1. ✅ Tạo migration cho 3 junction tables
2. ✅ Cập nhật Prisma schema
3. ✅ Implement API endpoints:
   - GET/PATCH `/api/classes/[classId]/tags`
   - GET/PATCH `/api/quizzes/[quizId]/tags`
   - GET/PATCH `/api/pools/[poolId]/tags`
   - Mở rộng GET `/api/tags` để include counts
4. ✅ Implement filter trong list APIs

### Phase 2: UI Components
1. ✅ Tạo `TagSelector` component (reusable)
2. ✅ Tạo `TagFilter` component cho list pages
3. ✅ Cập nhật các detail pages:
   - Classroom detail
   - Quiz detail
   - Pool detail
4. ✅ Cập nhật list pages với filter UI

### Phase 3: Testing & Polish
1. ✅ Test các use cases
2. ✅ Optimize performance (indexes, queries)
3. ✅ Add loading states, error handling
4. ✅ Documentation

## 6. Technical Considerations

### 6.1 Tag Normalization
- Sử dụng hàm `normalizeTagName()` đã có
- Convert to lowercase, trim, remove special chars
- Đảm bảo uniqueness qua `normalizedName`

### 6.2 Performance
- Indexes trên `[tagId, entityId]` và `[entityId, tagId]`
- Cache tag suggestions nếu cần
- Lazy load tags trong list views (chỉ load khi expand)

### 6.3 Data Consistency
- Cascade delete khi entity bị xóa
- Không xóa Tag khi không còn entity nào dùng (để giữ lịch sử)
- Có thể thêm "orphan tag cleanup" job sau này

### 6.4 Backward Compatibility
- Các API cũ vẫn hoạt động bình thường
- Tags là optional, không breaking changes
- Migration an toàn, không ảnh hưởng dữ liệu cũ

## 7. Examples

### 7.1 Use Case: Filter Classes
```
User muốn tìm tất cả classes:
- Năm 2025
- Thuộc nhóm IT
- Ở HCM

→ Filter: tags=["2025", "IT", "HCM"]
```

### 7.2 Use Case: Organize Quizzes
```
Teacher có nhiều quizzes:
- "Midterm 2025" → tags: ["midterm", "2025"]
- "Final Exam" → tags: ["final", "2025"]
- "Practice Quiz 1" → tags: ["practice", "quiz1"]

→ Có thể filter theo "midterm" để xem tất cả midterm exams
```

### 7.3 Use Case: Organize Pools
```
Teacher có nhiều pools:
- "Basic Questions" → tags: ["basic"]
- "Advanced Questions" → tags: ["advanced"]
- "Chapter 1 Questions" → tags: ["chapter1"]

→ Có thể filter theo "basic" để xem tất cả basic pools
```

## 8. Design Decisions (Đã chốt)

### 8.1 Tag Input
- ✅ **Comma-separated input** (giống như question tags hiện tại)
- ✅ Không cần autocomplete component phức tạp
- ✅ Simple Input field với placeholder: "tag1, tag2, tag3..."

### 8.2 Filter Logic
- ✅ **AND logic**: Entity phải có TẤT CẢ tags được chọn
- ✅ Query param: `tags=tag1,tag2` (comma-separated)

### 8.3 Tag Display
- ✅ **Tối đa 5 tags** có thể gắn vào một entity
- ✅ Hiển thị tối đa 5 tags trong list views (nếu có nhiều hơn thì show "+N")
- ✅ Hiển thị tất cả tags trong detail views

### 8.4 Tag Suggestions API
- ✅ **Không cần pagination**: API đã có `take: 20` - đủ cho suggestions
- ✅ User có thể search bằng query param `q` để filter
- ✅ 20 results là đủ cho dropdown/autocomplete UI

## 9. Open Questions / Future Enhancements

1. **Tag Categories**: Có nên có categories cho tags? (ví dụ: "Year", "Subject", "Location")
2. **Tag Colors**: Có nên cho phép user chọn màu cho tags?
3. **Tag Hierarchy**: Có nên support parent-child tags? (ví dụ: "IT" → "IT3020", "IT3010")
4. **Tag Suggestions**: AI-powered suggestions dựa trên tên entity?
5. **Bulk Operations**: Cho phép gắn tags cho nhiều entities cùng lúc?
6. **Tag Analytics**: Dashboard để xem thống kê tags usage?

## 10. Consistency với Existing Patterns

### 9.1 Tag Input Pattern
- Giống như trong `QuestionPoolDetail.tsx` (comma-separated input)
- Hoặc có thể upgrade lên autocomplete với suggestions

### 9.2 API Pattern
- Follow RESTful conventions
- Consistent error responses
- Authorization checks tương tự các endpoints khác

### 9.3 UI Pattern
- Sử dụng các components đã có: `Card`, `Badge`, `Button`, `Input`
- Consistent spacing và typography
- Dark theme support
