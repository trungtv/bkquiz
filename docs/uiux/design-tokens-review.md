# Design Tokens Review & Recommendations

## 📊 Tổng quan hiện tại

### ✅ Đã có đầy đủ

1. **Colors System**
   - Background layers (page, section, card, cardHover)
   - Text hierarchy (heading, body, muted, disabled, onPrimary)
   - Primary/Accent (orange CTA)
   - Semantic colors (success, warning, danger)
   - Borders (subtle, strong)

2. **Typography**
   - Font family (Inter)
   - Font sizes với line heights (xs → 3xl)
   - Font weights (semibold trong Button)

3. **Spacing (một phần)**
   - Custom values: 18, 22, 26, 30, touch (44px)
   - Tailwind default scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)

4. **Border Radius**
   - sm (8px), md (12px), lg (16px), xl (20px)
   - `rounded-full` (50%) - dùng trong Badge

5. **Shadows**
   - card, hover, focus

6. **Transitions**
   - Timing function (soft)
   - Duration (fast, normal, slow)

---

## 🔍 Patterns hay dùng trong codebase

### Spacing Patterns

Từ codebase analysis, các giá trị hay dùng:

| Pattern | Giá trị | Sử dụng |
|---------|---------|---------|
| **Card padding** | `p-4`, `p-5`, `p-6` | Hầu hết Card components |
| **Input padding** | `px-3 py-2` | Input, textarea, select |
| **Button padding** | `px-4 py-2` (sm), `px-5 py-3` (md) | Button sizes |
| **Gap (flex/grid)** | `gap-2`, `gap-3`, `gap-4` | Layout spacing |
| **Vertical spacing** | `space-y-3`, `space-y-4`, `space-y-6`, `space-y-7` | Section spacing |
| **Horizontal spacing** | `space-x-2`, `space-x-3` | Inline elements |

### Border Radius Patterns

| Value | Usage |
|-------|-------|
| `rounded-sm` (8px) | Button, Input, textarea |
| `rounded-md` (12px) | Card, Toast |
| `rounded-full` (50%) | Badge |

### Z-index Patterns

| Value | Usage |
|-------|-------|
| `z-10` | DemoBadge |
| `z-40` | Sticky header (student attempt) |
| `z-50` | Toast, main header, banner |

---

## ❌ Thiếu sót cần bổ sung

### 1. **Z-index Scale** (Quan trọng)

Hiện tại dùng hardcoded values → khó maintain, dễ conflict.

**Đề xuất:**
```ts
zIndex: {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
}
```

**Lợi ích:**
- Tránh z-index conflicts
- Dễ maintain và scale
- Semantic naming

---

### 2. **Opacity Scale** (Quan trọng)

Hiện dùng hardcoded: `opacity-50`, `opacity-60`, `/10`, `/20`, `/40`, `/90`

**Đề xuất:**
```ts
opacity: {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.4,
  subtle: 0.1,
  medium: 0.2,
  strong: 0.3,
}
```

**Lợi ích:**
- Consistent disabled states
- Consistent overlay/backdrop
- Consistent semantic color variants (success/10, danger/20)

---

### 3. **Container Max-widths** (Quan trọng)

Hiện dùng hardcoded: `max-w-6xl`, `max-w-4xl`, etc.

**Đề xuất:**
```ts
maxWidth: {
  xs: '20rem',      // 320px
  sm: '24rem',      // 384px
  md: '28rem',      // 448px
  lg: '32rem',      // 512px
  xl: '36rem',      // 576px
  '2xl': '42rem',   // 672px
  '3xl': '48rem',   // 768px
  '4xl': '56rem',   // 896px
  '5xl': '64rem',   // 1024px
  '6xl': '72rem',   // 1152px
  '7xl': '80rem',   // 1280px
  container: '1280px', // Dashboard max-width
  content: '1024px',   // Content area max-width
}
```

**Lợi ích:**
- Consistent layout widths
- Responsive design dễ hơn
- Semantic naming (container, content)

---

### 4. **Animation Presets** (Nice to have)

Hiện có `duration-fast`, `duration-normal`, `duration-slow` nhưng thiếu animation names.

**Đề xuất:**
```ts
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideUp: {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  scaleIn: {
    '0%': { transform: 'scale(0.95)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
},
animation: {
  fadeIn: 'fadeIn 150ms ease-out',
  slideUp: 'slideUp 200ms ease-out',
  slideDown: 'slideDown 200ms ease-out',
  scaleIn: 'scaleIn 150ms ease-out',
},
```

**Lợi ích:**
- Consistent animations
- Reusable animation classes
- Better UX với micro-interactions

---

### 5. **Letter Spacing** (Nice to have)

Cho typography refinement.

**Đề xuất:**
```ts
letterSpacing: {
  tighter: '-0.02em',
  tight: '-0.01em',
  normal: '0',
  wide: '0.01em',
  wider: '0.02em',
  widest: '0.05em',
}
```

**Lợi ích:**
- Typography refinement
- Better readability cho headings
- Brand consistency

---

### 6. **Line Height Tokens** (Nice to have)

Hiện có trong `fontSize` nhưng có thể tách riêng cho flexibility.

**Đề xuất:**
```ts
lineHeight: {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}
```

**Lợi ích:**
- Flexible line heights
- Better typography control
- Consistent với Tailwind defaults

---

## 🎯 Priority Recommendations

### 🔥 High Priority (Nên làm ngay)

1. **Z-index Scale** - Tránh conflicts, dễ maintain
2. **Opacity Scale** - Consistent disabled/overlay states
3. **Container Max-widths** - Layout consistency

### 🚀 Medium Priority (Làm sau)

4. **Animation Presets** - Better UX với micro-interactions

### 💡 Low Priority (Nice to have)

5. **Letter Spacing** - Typography refinement
6. **Line Height Tokens** - More flexibility (đã có trong fontSize)

---

## 📝 Implementation Plan

### Step 1: Add Z-index Scale
```ts
// tailwind.config.ts
zIndex: {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
}
```

### Step 2: Add Opacity Scale
```ts
opacity: {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.4,
  subtle: 0.1,
  medium: 0.2,
  strong: 0.3,
}
```

### Step 3: Add Container Max-widths
```ts
maxWidth: {
  container: '1280px',
  content: '1024px',
  // ... other values
}
```

### Step 4: Refactor existing code
- Replace hardcoded z-index với semantic tokens
- Replace hardcoded opacity với semantic tokens
- Replace hardcoded max-width với semantic tokens

---

## ✅ Kết luận

**Design tokens hiện tại: 7/10**

**Đã tốt:**
- Colors system đầy đủ và rõ ràng
- Typography system tốt
- Spacing, border radius, shadows đủ dùng

**Cần cải thiện:**
- Z-index scale (high priority)
- Opacity scale (high priority)
- Container max-widths (high priority)
- Animation presets (medium priority)

**Sau khi bổ sung → 9/10** (production-ready design system)

