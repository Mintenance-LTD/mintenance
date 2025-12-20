# Contractor Design System

> A clean, professional design system inspired by Airbnb's minimal aesthetic

## Design Principles

### 1. Clean & Minimal
- Embrace white space
- Use subtle shadows instead of heavy gradients
- Professional icons only (Lucide React)
- Clear visual hierarchy

### 2. Consistency
- Standardized spacing grid (4px base)
- Predictable component patterns
- Uniform typography scale
- Consistent color usage

---

## Color Palette

### Primary Colors
```css
--primary-blue: #0066CC;      /* Primary actions, links */
--primary-blue-hover: #0052A3; /* Hover states */
--primary-blue-light: #E6F2FF; /* Light backgrounds */
```

### Neutral Colors
```css
--gray-50: #F7F7F7;   /* Light backgrounds */
--gray-100: #E5E5E5;  /* Borders, dividers */
--gray-600: #717171;  /* Secondary text */
--gray-900: #222222;  /* Primary text, headings */
```

### Semantic Colors
```css
--success: #10B981;   /* Success states */
--warning: #F59E0B;   /* Warning states */
--error: #EF4444;     /* Error states */
--info: #3B82F6;      /* Info states */
```

### Usage Guidelines

**DO:**
- Use `--primary-blue` for primary CTAs
- Use `--gray-900` for headings
- Use `--gray-600` for body text
- Use semantic colors for status indicators

**DON'T:**
- Mix custom colors outside the palette
- Use pure black (#000000)
- Overuse accent colors

---

## Typography

### Scale
```typescript
text-xs:   12px / 1.5    // Small labels, captions
text-sm:   14px / 1.5    // Body text, descriptions
text-base: 16px / 1.5    // Standard body
text-lg:   18px / 1.5    // Section titles
text-xl:   20px / 1.5    // Subsection headings
text-2xl:  24px / 1.333  // Page titles
text-3xl:  30px / 1.333  // Hero text
```

### Weights
```typescript
font-normal:    400  // Body text
font-medium:    500  // Emphasized text
font-semibold:  600  // Headings, titles
```

### Hierarchy Components
Use the Typography component for consistency:

```tsx
<PageTitle>Dashboard</PageTitle>
<SectionTitle>Recent Activity</SectionTitle>
<CardTitle>Job Details</CardTitle>
<Body>Standard body text</Body>
<Caption>Small caption text</Caption>
```

### Usage Guidelines

**DO:**
- Use font-semibold (600) for all headings
- Use font-normal (400) for body text
- Maintain consistent line heights (leading-relaxed)
- Use text hierarchy to guide users

**DON'T:**
- Use font-bold (700) - too heavy
- Mix multiple weights in one component
- Use text smaller than 12px
- Use emojis as visual elements

---

## Spacing System

### Grid (4px base)
```typescript
0:    0px
1:    4px    // xs
2:    8px    // sm
3:    12px
4:    16px   // md
6:    24px   // lg
8:    32px   // xl
12:   48px   // 2xl
16:   64px   // 3xl
```

### Application

**Component Padding:**
- Card padding: `24px` (p-6)
- Button padding: `12px 24px` (px-6 py-3)
- Input padding: `12px 16px` (px-4 py-3)

**Component Spacing:**
- Between cards: `24px` (space-y-6 or gap-6)
- Between sections: `48px` (space-y-12)
- Between form fields: `16px` (space-y-4)

**Page Layout:**
- Container max-width: `1280px`
- Page padding: `32px` from all edges
- Mobile padding: `16px`

### Usage Guidelines

**DO:**
- Use consistent spacing from the grid
- Maintain 32px padding from sidebar
- Use generous spacing between sections
- Follow the spacing hierarchy

**DON'T:**
- Use arbitrary spacing values
- Let content touch edges
- Cram elements together
- Use inconsistent gaps

---

## Components

### Cards

#### Standard Card
```tsx
<StandardCard>
  <CardTitle>Card Title</CardTitle>
  <Body>Card content goes here</Body>
</StandardCard>
```

**Specs:**
- Background: `#FFFFFF`
- Border radius: `12px` (rounded-xl)
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Padding: `24px` (p-6)
- Border: None (rely on shadow)

#### Card Variants
```tsx
<StandardCard variant="default" />  // Standard card
<StandardCard variant="hover" />    // Interactive card with hover
<StandardCard variant="outlined" /> // Card with border, no shadow
```

### Buttons

#### Primary Button
```tsx
<button className="px-6 py-3 bg-[#0066CC] text-white rounded-lg font-medium hover:bg-[#0052A3] transition-colors">
  Primary Action
</button>
```

**Specs:**
- Padding: `12px 24px` (px-6 py-3)
- Border radius: `8px` (rounded-lg)
- Font weight: `500` (font-medium)
- Transition: `transition-colors`

#### Button Variants
- **Primary:** Blue background, white text
- **Secondary:** Gray background, dark text
- **Outline:** Border only, transparent background
- **Ghost:** No background, hover shows background

### Icons

**Always use Lucide React:**
```tsx
import { Home, Calendar, DollarSign } from 'lucide-react';

<Home className="w-5 h-5 text-gray-600" strokeWidth={2} />
```

**Specs:**
- Size: `20px` (w-5 h-5)
- Stroke width: `2`
- Color: Match text color or use `text-gray-600`

**Icon Mapping:**
```typescript
// Replace emojis with professional icons
"📊" → <BarChart3 />
"💰" → <DollarSign />
"📅" → <Calendar />
"👤" → <User />
"⚙️" → <Settings />
"🎯" → <Target />
```

---

## Layout Patterns

### Page Container
```tsx
<ContractorLayout>
  <PageTitle>Page Title</PageTitle>
  {/* Page content */}
</ContractorLayout>
```

**Structure:**
```
┌─────────────────────────────────────┐
│  Sidebar   │  Content Area          │
│            │  ┌──────────────────┐  │
│            │  │  32px padding    │  │
│            │  │                  │  │
│            │  │  Max 1280px      │  │
│            │  │                  │  │
│            │  └──────────────────┘  │
└─────────────────────────────────────┘
```

### Grid Layouts

**Two Column:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <StandardCard>Column 1</StandardCard>
  <StandardCard>Column 2</StandardCard>
</div>
```

**Three Column:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <StandardCard>Column 1</StandardCard>
  <StandardCard>Column 2</StandardCard>
  <StandardCard>Column 3</StandardCard>
</div>
```

**Stats Grid:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Stat cards */}
</div>
```

---

## Do's and Don'ts

### Visual Design

**DO:**
- Use generous white space
- Keep shadows subtle (1-3px blur)
- Use consistent border radius (12px for cards, 8px for buttons)
- Maintain clear visual hierarchy
- Use icons consistently at 20px

**DON'T:**
- Use heavy gradients or drop shadows
- Mix border radius sizes arbitrarily
- Use emojis in UI
- Overcrowd the interface
- Use multiple icon sizes

### Color Usage

**DO:**
- Stick to the defined palette
- Use semantic colors appropriately
- Maintain sufficient contrast (WCAG AA)
- Use gray for secondary elements

**DON'T:**
- Introduce new colors
- Use pure black or pure white for text
- Overuse bright accent colors
- Use color as the only indicator

### Typography

**DO:**
- Use the typography components
- Maintain consistent hierarchy
- Use font-semibold for headings
- Keep line heights generous

**DON'T:**
- Use font-bold (too heavy)
- Mix many font weights
- Use text smaller than 12px
- Create custom text styles

### Spacing

**DO:**
- Follow the 4px grid
- Use consistent gaps between elements
- Maintain 32px page padding
- Use space-y and gap utilities

**DON'T:**
- Use arbitrary spacing values
- Let content touch edges
- Inconsistently space similar elements
- Use margin when gap/space-y works

---

## Component Checklist

When building new components, ensure:

- [ ] Uses StandardCard for card layouts
- [ ] Uses Typography components for text
- [ ] Uses Lucide icons (not emojis)
- [ ] Follows spacing grid (4px base)
- [ ] Uses colors from palette
- [ ] Has consistent border radius
- [ ] Includes hover states where appropriate
- [ ] Is responsive (mobile-first)
- [ ] Has proper contrast ratios
- [ ] Maintains visual hierarchy

---

## Currency Display

**Always format as USD:**
```tsx
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Usage
<span className="text-2xl font-semibold text-gray-900">
  {formatCurrency(1234.56)}
</span>
// Output: $1,234.56
```

**DO:**
- Use consistent currency formatting
- Show dollars with 2 decimal places
- Use font-semibold for amounts
- Align decimals in tables

**DON'T:**
- Mix currency formats
- Show unnecessary decimals (.00)
- Use different fonts for currency

---

## Accessibility

### Requirements
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Focus states on all interactive elements
- Keyboard navigation support
- Semantic HTML structure
- ARIA labels where needed

### Best Practices
```tsx
// Focus states
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Accessible buttons
<button aria-label="Close menu">
  <X className="w-5 h-5" />
</button>

// Semantic structure
<section aria-labelledby="section-title">
  <h2 id="section-title">Section Title</h2>
</section>
```

---

## Migration Guide

### Updating Existing Components

1. **Replace emojis with Lucide icons**
   ```tsx
   // Before
   <span>📊</span>

   // After
   import { BarChart3 } from 'lucide-react';
   <BarChart3 className="w-5 h-5 text-gray-600" strokeWidth={2} />
   ```

2. **Use StandardCard component**
   ```tsx
   // Before
   <div className="bg-white rounded-lg shadow p-4">

   // After
   <StandardCard>
   ```

3. **Use Typography components**
   ```tsx
   // Before
   <h1 className="text-3xl font-bold">Title</h1>

   // After
   <PageTitle>Title</PageTitle>
   ```

4. **Apply consistent spacing**
   ```tsx
   // Before
   <div className="mt-5 mb-7">

   // After
   <div className="space-y-6">
   ```

---

## Resources

### Tools
- [Lucide React Icons](https://lucide.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### References
- Airbnb Design System
- Material Design Spacing
- Apple Human Interface Guidelines

### Support
For questions or clarifications, refer to this document or consult the design team.
