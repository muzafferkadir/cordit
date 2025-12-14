---
trigger: always_on
---

# Frontend Coding Rules

## 1. Styling Rules

### Use Tailwind Classes
- **Always prefer Tailwind classes** over inline styles
- Use design system colors defined in `globals.css` `@theme` section
- Available color classes: `bg-primary`, `bg-secondary`, `bg-success`, `bg-error`, `bg-warning`, `bg-purple`, `bg-cyan`, `text-white`, `text-text-secondary`

### Avoid Inline Styles
```tsx
// ❌ BAD
style={{ background: 'var(--success)', padding: '1rem' }}

// ✅ GOOD  
className="bg-success p-4"
```

### Dynamic Backgrounds
For dynamic/computed backgrounds, use helper functions:
```tsx
const getCardBg = (idx: number) => {
  const bgs = ['bg-bg-card', 'bg-bg-secondary', 'bg-success-bg', 'bg-bg-purple'];
  return bgs[idx % 4];
};
```

## 2. Component Rules

### No Emojis in UI
- Don't use emojis in buttons, messages or UI text
- Use plain uppercase text for clarity

```tsx
// ❌ BAD
setSuccess(`✅ Created code: ${data.code}`);

// ✅ GOOD
setSuccess(`Created code: ${data.code}`);
```

### Brutal Design Components
Use these base classes and add Tailwind utilities:
- `btn-brutal` - Add: `bg-success`, `text-white`, `px-5 py-2`
- `card-brutal` - Add: `p-4`, `bg-error`, etc.
- `badge-brutal` - Add: `bg-purple`, `text-white`
- `input-brutal` - Add: `w-full`

## 3. Responsive Design

### Mobile-First Approach
- Use `md:` prefix for desktop-specific styles
- Mobile navigation: `flex md:hidden`
- Desktop navigation: `hidden md:flex`

### Mobile-Only Elements
Use `mobile-only` class for elements that should only appear on mobile:
```tsx
className="mobile-only md:hidden"
```

## 4. Color Palette Reference

### Semantic Colors
| Class | Usage |
|-------|-------|
| `bg-primary` / `text-primary` | Primary actions (cyan) |
| `bg-secondary` / `text-secondary` | Secondary actions (purple) |
| `bg-success` | Success states, confirmations |
| `bg-error` | Errors, destructive actions |
| `bg-warning` | Warnings |

### Background Colors
| Class | Usage |
|-------|-------|
| `bg-bg-main` | Main page background |
| `bg-bg-card` | Card backgrounds |
| `bg-bg-secondary` | Secondary sections |
| `bg-bg-purple` | Purple tinted cards |

### Text Colors
| Class | Usage |
|-------|-------|
| `text-white` | Text on colored backgrounds |
| `text-text-primary` | Main body text |
| `text-text-secondary` | Muted/secondary text |

## 5. Spacing Guidelines

Use Tailwind spacing utilities:
- `p-4` = 1rem padding
- `px-6 py-4` = horizontal 1.5rem, vertical 1rem
- `gap-3` = 0.75rem gap
- `mb-4` = 1rem margin bottom

## 6. File Organization

### No Comments in JSX
Remove unnecessary JSX comments like:
```tsx
// ❌ Remove these
{/* Mobile Navigation */}
{/* Desktop Sidebar */}
```

### Clean Imports
Remove unused imports from files.

## 7. CSS Rules (globals.css)

### Don't Override Tailwind
- Don't use `* { padding: 0; margin: 0; }` - Tailwind Preflight handles this
- Don't set fixed padding in `.card-brutal` or `.btn-brutal` - use Tailwind classes

### @theme Usage
Define colors in `@theme inline {}` for Tailwind access:
```css
@theme inline {
  --color-success: #4ADE80;
  --color-error: #FF6B6B;
}
```