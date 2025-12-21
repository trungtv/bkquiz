# Dashboard Role-Based UI/UX Redesign

## 🎯 Mục tiêu

Tạo dashboard **hoàn toàn khác biệt** cho Teacher và Student, phù hợp với workflow và nhu cầu của từng role.

---

## 📊 Phân tích hiện tại

### Teacher Dashboard (Hiện tại)
- ✅ KPIs: Classes, Quizzes, Active Sessions
- ✅ Recent Classes list
- ✅ Quick Access sidebar
- ✅ Getting Started guide
- ⚠️ **Vấn đề**: Vẫn còn generic, chưa focus vào workflow của teacher

### Student Dashboard (Hiện tại)
- ✅ KPIs: Classes, My Active Sessions, My Attempts
- ✅ Recent Classes list
- ✅ Quick Access sidebar
- ✅ Getting Started guide (student-specific)
- ⚠️ **Vấn đề**: Vẫn giống structure của teacher, chỉ khác content

---

## 🎨 Đề xuất Redesign

### Option A: **Completely Separate Layouts** ⭐ (Recommended)

**Ưu điểm:**
- Clear distinction
- Optimized cho từng workflow
- Dễ maintain và extend

**Nhược điểm:**
- Cần maintain 2 layouts
- Có thể duplicate code

**Implementation:**
```tsx
// dashboard/page.tsx
if (role === 'teacher') {
  return <TeacherDashboard />;
}
return <StudentDashboard />;
```

---

### Option B: **Conditional Sections** (Current approach)

**Ưu điểm:**
- Single file, dễ maintain
- Shared components

**Nhược điểm:**
- Vẫn có structure chung
- Khó optimize cho từng role

---

## 🎯 Teacher Dashboard Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header: BKquiz Dashboard [Teacher]      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ Classes │  │ Quizzes │  │Sessions ││
│  │    3    │  │   12    │  │    2    ││
│  └─────────┘  └─────────┘  └─────────┘│
│                                         │
│  ┌───────────────────────────────────┐│
│  │ Quick Actions                      ││
│  │ [Create Class] [Create Quiz]      ││
│  │ [Import Pool]                      ││
│  └───────────────────────────────────┘│
│                                         │
│  ┌──────────────────┐  ┌─────────────┐│
│  │ Recent Classes   │  │ Active      ││
│  │ (with actions)   │  │ Sessions    ││
│  └──────────────────┘  └─────────────┘│
│                                         │
│  ┌───────────────────────────────────┐│
│  │ Getting Started (collapsible)     ││
│  └───────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Key Features
1. **Quick Actions Bar**
   - Prominent buttons: "Create Class", "Create Quiz", "Import Pool"
   - One-click access to most common tasks

2. **Active Sessions Widget**
   - List of active sessions with:
     - Quiz title
     - Student count
     - Time remaining
     - Quick link to teacher screen

3. **Recent Classes với Actions**
   - Each class card có:
     - "Create Session" button
     - "View Members" link
     - "View Sessions" link

4. **Quiz Status Overview**
   - Draft quizzes count
   - Published quizzes count
   - Quizzes without rules warning

---

## 🎯 Student Dashboard Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header: BKquiz Dashboard [Student]      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │Classes  │  │Active   │  │Attempts││
│  │    3    │  │    2    │  │   15   ││
│  └─────────┘  └─────────┘  └─────────┘│
│                                         │
│  ┌───────────────────────────────────┐│
│  │ Active Sessions (Priority)         ││
│  │ ┌───────────────────────────────┐ ││
│  │ │ Quiz: DSA Week 3              │ ││
│  │ │ Status: Active | Time: 45min  │ ││
│  │ │ [Continue →]                  │ ││
│  │ └───────────────────────────────┘ ││
│  └───────────────────────────────────┘│
│                                         │
│  ┌──────────────────┐  ┌─────────────┐│
│  │ My Classes      │  │ Performance ││
│  │ (quick access)   │  │ Summary     ││
│  └──────────────────┘  └─────────────┘│
│                                         │
│  ┌───────────────────────────────────┐│
│  │ Getting Started (collapsible)     ││
│  └───────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Key Features
1. **Active Sessions Priority**
   - Large, prominent cards for active sessions
   - Clear "Continue" or "Join" buttons
   - Time remaining indicator

2. **Performance Summary Widget**
   - Average score (large number)
   - Recent score trend (mini chart or list)
   - Link to full performance page

3. **My Classes Quick Access**
   - Compact list với:
     - Class name
     - Active sessions count
     - Quick join button

4. **Upcoming Sessions**
   - Sessions in "lobby" status
   - Countdown to start (if available)

---

## 📋 Implementation Plan

### Phase 1: Separate Components (2-3 giờ)
1. Create `TeacherDashboard.tsx`
2. Create `StudentDashboard.tsx`
3. Refactor `dashboard/page.tsx` to route based on role

### Phase 2: Teacher Dashboard Enhancements (2-3 giờ)
1. Add Quick Actions Bar
2. Add Active Sessions Widget
3. Enhance Recent Classes với actions
4. Add Quiz Status Overview

### Phase 3: Student Dashboard Enhancements (2-3 giờ)
1. Prioritize Active Sessions (large cards)
2. Add Performance Summary Widget
3. Add Upcoming Sessions section
4. Optimize My Classes display

### Phase 4: Polish (1-2 giờ)
1. Animations và transitions
2. Empty states
3. Loading states
4. Responsive design

---

## 🎨 Design Tokens Usage

### Teacher Theme
- Primary: Orange (`primary`)
- Accent: Orange variants
- Cards: Standard charcoal

### Student Theme
- Primary: Indigo (`indigo-400/500`)
- Accent: Indigo variants
- Cards: Indigo-tinted borders (`border-indigo-500/30`)

---

## ✅ Checklist

### Teacher Dashboard
- [ ] Quick Actions Bar
- [ ] Active Sessions Widget
- [ ] Enhanced Recent Classes
- [ ] Quiz Status Overview
- [ ] Collapsible Getting Started

### Student Dashboard
- [ ] Active Sessions Priority Cards
- [ ] Performance Summary Widget
- [ ] My Classes Quick Access
- [ ] Upcoming Sessions
- [ ] Collapsible Getting Started

---

## 🚀 Next Steps

1. **Review và approve design**
2. **Implement Phase 1** (separate components)
3. **Iterate** based on feedback
4. **Polish** animations và responsive

