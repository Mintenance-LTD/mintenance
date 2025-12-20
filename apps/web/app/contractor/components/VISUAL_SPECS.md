# Professional Contractor Layout - Visual Specifications

## Layout Measurements (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ SIDEBAR: 256px (w-64)          │ HEADER: Full Width - 256px         │
│ Background: #1E293B            │ Height: 64px (h-16)                │
│                                │ Background: #FFFFFF                 │
│ ┌──────────────────────────┐  │ Border-bottom: 1px #E5E7EB         │
│ │ Logo Area                │  │                                     │
│ │ Height: 64px             │  │ ┌──────────┬─────────────────────┐ │
│ │ Padding: 24px            │  │ │ Mobile   │ Page Title          │ │
│ └──────────────────────────┘  │ │ Menu Btn │ 24px Bold           │ │
│                                │ │          │                     │ │
│ ┌──────────────────────────┐  │ └──────────┴─────────────────────┘ │
│ │ Quick Action             │  │                                     │
│ │ Padding: 16px            │  │ Search Bar + Notifications + Avatar │
│ │ Button: Gradient Teal    │  └─────────────────────────────────────┘
│ └──────────────────────────┘  │
│                                │ MAIN CONTENT AREA
│ Navigation Sections            │ Background: #F9FAFB
│ ┌──────────────────────────┐  │ Padding: 32px on desktop
│ │ MAIN                     │  │ Max-width: 1280px (max-w-7xl)
│ │ - Dashboard              │  │
│ │ - Discover Jobs          │  │ ┌────────────────────────────────┐
│ ├──────────────────────────┤  │ │ Content cards with shadow      │
│ │ WORK                     │  │ │ Background: #FFFFFF            │
│ │ - My Jobs (Expandable)   │  │ │ Rounded: 8px (rounded-lg)      │
│ │   - All Jobs             │  │ │ Shadow: 0 1px 3px rgba(0,0,0,0.1) │
│ │   - Active               │  │ │ Padding: 24px (p-6)            │
│ │   - Completed            │  │ └────────────────────────────────┘
│ │ - Messages [Badge]       │  │
│ │ - Calendar               │  │
│ │ - Quotes                 │  │
│ │ - Invoices               │  │
│ ├──────────────────────────┤  │
│ │ BUSINESS                 │  │
│ │ - Reports                │  │
│ │ - Finance                │  │
│ │ - Portfolio              │  │
│ │ - Customers              │  │
│ │ - Marketing              │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ User Profile             │  │
│ │ Avatar + Name + Email    │  │
│ │ Dropdown Menu            │  │
│ └──────────────────────────┘  │
│                                │
└────────────────────────────────┴─────────────────────────────────────┘
```

## Sidebar Specifications

### Logo Area
```
Height: 64px (h-16)
Padding: 16px (px-6)
Border-bottom: 1px solid #1E293B (border-slate-800)

Logo Badge:
  Size: 32px × 32px (w-8 h-8)
  Background: Linear gradient teal-500 to teal-600
  Border-radius: 8px (rounded-lg)
  Text: "M" - 18px bold, white

Brand Text:
  Font-size: 18px (text-lg)
  Font-weight: 600 (semibold)
  Color: white
```

### Quick Action Button
```
Container Padding: 16px (p-4)
Button:
  Width: 100% (w-full)
  Padding: 10px 16px (py-2.5 px-4)
  Background: Linear gradient teal-500 to teal-600
  Hover: teal-600 to teal-700
  Border-radius: 8px (rounded-lg)
  Font-weight: 600 (semibold)
  Color: white
  Shadow: Large (shadow-lg)
  Hover Shadow: Extra large (hover:shadow-xl)

  Icon:
    Size: 16px (w-4 h-4)
    Position: Before text with 8px gap
```

### Navigation Sections
```
Section Container:
  Margin-bottom: 24px (mb-6)

Section Header:
  Padding: 16px 24px 8px (px-6 pt-4 pb-2)
  Font-size: 12px (text-xs)
  Font-weight: 600 (semibold)
  Color: #64748B (slate-500)
  Text-transform: uppercase
  Letter-spacing: 0.05em

Navigation Item:
  Padding: 8px 12px (px-3 py-2)
  Border-radius: 8px (rounded-lg)
  Font-size: 14px (text-sm)
  Font-weight: 500 (medium)
  Margin-bottom: 4px (space-y-1)
  Transition: all 200ms

  Icon:
    Size: 20px (w-5 h-5)
    Flex-shrink: 0

  States:
    Default:
      Color: #CBD5E1 (slate-300)
      Background: transparent

    Hover:
      Color: white
      Background: #1E293B (slate-800)

    Active:
      Color: #2DD4BF (teal-400)
      Background: rgba(20, 184, 166, 0.1) (teal-500/10)

  Badge:
    Min-width: 20px
    Padding: 2px 8px (px-2 py-0.5)
    Background: #14B8A6 (teal-500)
    Color: white
    Border-radius: 9999px (rounded-full)
    Font-size: 12px (text-xs)
    Font-weight: 600 (semibold)
```

### Expandable Items
```
Parent Item:
  Same as navigation item

Chevron Icon:
  Size: 16px (w-4 h-4)
  Transition: transform 200ms
  Rotate: 180deg when expanded

Children Container:
  Margin-left: 32px (ml-8)
  Margin-top: 4px (mt-1)
  Animation: Height expand/collapse (200ms)

Child Item:
  Padding: 8px 12px (px-3 py-2)
  Font-size: 14px (text-sm)
  Same hover/active states as parent
```

### User Profile Footer
```
Container:
  Border-top: 1px solid #1E293B (slate-800)
  Padding: 16px (p-4)

Profile Button:
  Width: 100% (w-full)
  Padding: 8px 12px (px-3 py-2)
  Border-radius: 8px (rounded-lg)
  Hover: Background slate-800
  Transition: all 200ms

Avatar:
  Size: 36px (w-9 h-9)
  Border-radius: 9999px (rounded-full)
  Background: Linear gradient teal-500 to teal-600

  Initials:
    Font-size: 14px (text-sm)
    Font-weight: 600 (semibold)
    Color: white

Name Text:
  Font-size: 14px (text-sm)
  Font-weight: 500 (medium)
  Color: white
  Truncate: overflow hidden

Email/Company Text:
  Font-size: 12px (text-xs)
  Color: #94A3B8 (slate-400)
  Truncate: overflow hidden

Dropdown Menu:
  Position: absolute, bottom-full
  Margin-bottom: 8px (mb-2)
  Background: #1E293B (slate-800)
  Border: 1px solid #334155 (slate-700)
  Border-radius: 8px (rounded-lg)
  Shadow: Extra large
  Padding: 8px 0 (py-2)

  Menu Item:
    Padding: 8px 16px (px-4 py-2)
    Font-size: 14px (text-sm)
    Color: #CBD5E1 (slate-300)
    Hover: Background slate-700, Color white

    Icon:
      Size: 16px (w-4 h-4)
      Margin-right: 12px (gap-3)

  Divider:
    Height: 1px
    Background: #334155 (slate-700)
    Margin: 8px 0 (my-2)

  Sign Out (Danger):
    Color: #F87171 (red-400)
    Hover: Color red-300
```

## Header Specifications

### Container
```
Height: 64px (h-16)
Position: sticky top-0
Z-index: 30
Background: white
Border-bottom: 1px solid #E5E7EB (gray-200)
Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Padding: 16px 32px on desktop (px-4 lg:px-8)
Padding: 16px on mobile
```

### Mobile Menu Button
```
Visible: Only on screens < 1024px
Size: 40px (p-2)
Border-radius: 8px (rounded-lg)
Hover: Background #F3F4F6 (gray-100)
Transition: all 200ms

Icon:
  Size: 24px (w-6 h-6)
  Color: #4B5563 (gray-600)
```

### Page Title
```
Font-size: 20px on mobile (text-xl)
Font-size: 24px on desktop (lg:text-2xl)
Font-weight: 700 (bold)
Color: #111827 (gray-900)
Margin-left: 16px after mobile menu button
```

### Search Bar
```
Visible: Only on desktop (hidden md:block)
Position: relative
Width: 256px (w-64)

Icon:
  Position: absolute left-12px top-50%
  Size: 16px (w-4 h-4)
  Color: #9CA3AF (gray-400)

Input:
  Width: 100%
  Padding: 8px 16px 8px 40px (py-2 pr-4 pl-10)
  Background: #F9FAFB (gray-50)
  Border: 1px solid #E5E7EB (gray-200)
  Border-radius: 8px (rounded-lg)
  Font-size: 14px (text-sm)

  Focus:
    Outline: none
    Ring: 2px teal-500
    Border: transparent
```

### Notification Button
```
Position: relative
Size: 40px (p-2)
Border-radius: 8px (rounded-lg)
Hover: Background #F3F4F6 (gray-100)
Transition: all 200ms

Icon:
  Size: 20px (w-5 h-5)
  Color: #4B5563 (gray-600)

Badge Indicator:
  Position: absolute top-1 right-1
  Size: 8px (w-2 h-2)
  Background: #EF4444 (red-500)
  Border-radius: 9999px (rounded-full)
```

### Profile Avatar (Header)
```
Visible: Only on desktop (hidden lg:block)
Size: 36px (w-9 h-9)
Border: 2px solid #E5E7EB (gray-200)
Border-radius: 9999px (rounded-full)
Object-fit: cover
```

## Main Content Area

### Container
```
Flex: 1 (flex-1)
Padding: 16px on mobile (p-4)
Padding: 32px on desktop (lg:p-8)

Inner Container:
  Max-width: 1280px (max-w-7xl)
  Margin: 0 auto (mx-auto)
```

### Content Cards (Recommended)
```
Background: white
Border-radius: 8px (rounded-lg)
Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) (shadow)
Padding: 24px (p-6)

Grid Layout:
  1 column on mobile (grid-cols-1)
  2 columns on tablet (md:grid-cols-2)
  3 columns on desktop (lg:grid-cols-3)
  Gap: 24px (gap-6)
```

### Stats Cards (Pattern)
```
Background: white
Border-radius: 8px (rounded-lg)
Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Padding: 24px (p-6)

Icon Badge:
  Size: 48px (w-12 h-12)
  Background: #CCFBF1 (teal-100)
  Border-radius: 8px (rounded-lg)

  Icon:
    Size: 24px (w-6 h-6)
    Color: #0D9488 (teal-600)

Label:
  Font-size: 14px (text-sm)
  Color: #4B5563 (gray-600)

Value:
  Font-size: 30px (text-3xl)
  Font-weight: 700 (bold)
  Color: #111827 (gray-900)
  Margin-top: 4px (mt-1)

Change Indicator:
  Font-size: 14px (text-sm)
  Margin-top: 16px (mt-4)

  Positive:
    Color: #059669 (green-600)
    Icon: ↑

  Negative:
    Color: #DC2626 (red-600)
    Icon: ↓
```

## Responsive Breakpoints

```css
/* Mobile First Approach */

/* Mobile (Default) */
@media (min-width: 0px) {
  Sidebar: Hidden by default, slides in
  Header: Compact with menu button
  Content Padding: 16px
  Page Title: 20px
  Cards: 1 column
}

/* Tablet */
@media (min-width: 768px) {
  Search Bar: Visible
  Cards: 2 columns
}

/* Desktop */
@media (min-width: 1024px) {
  Sidebar: Always visible, 256px fixed
  Header: Full search bar, avatar visible
  Content Padding: 32px
  Page Title: 24px
  Cards: 3 columns
  Mobile Menu Button: Hidden
}

/* Large Desktop */
@media (min-width: 1280px) {
  Content Max-width: 1280px
}
```

## Animation Timings

```css
/* Standard Transitions */
transition: all 200ms ease-in-out

/* Sidebar Slide */
transform: translateX(-100%)
transition: transform 300ms ease-in-out

/* Dropdown Expand */
animation: height expand 200ms ease-in-out

/* Chevron Rotate */
transform: rotate(180deg)
transition: transform 200ms ease-in-out

/* Hover States */
transition: background-color 200ms ease-in-out
transition: color 200ms ease-in-out

/* Mobile Overlay */
initial: opacity 0
animate: opacity 1
transition: 200ms
```

## Color Contrast Ratios (WCAG AA Compliant)

```
White text on Slate-900: 12.63:1 ✅ (AAA)
Teal-400 text on Slate-900: 4.52:1 ✅ (AA)
Slate-300 text on Slate-900: 7.21:1 ✅ (AAA)
Gray-900 text on White: 16.68:1 ✅ (AAA)
Gray-600 text on White: 5.74:1 ✅ (AA)
Teal-500 on White: 2.86:1 ⚠️ (Use for graphics only, not text)
```

## Z-Index Hierarchy

```
Mobile Overlay: z-40
Sidebar: z-50
Header: z-30
Dropdown Menu: Relative stacking
Content: z-1 (default)
```

## Icon Sizes Reference

```css
/* Sidebar Logo */
32px × 32px (w-8 h-8)

/* Quick Action Button Icon */
16px × 16px (w-4 h-4)

/* Navigation Icons */
20px × 20px (w-5 h-5)

/* Chevron Icons */
16px × 16px (w-4 h-4)

/* User Profile Avatar */
36px × 36px (w-9 h-9)

/* Dropdown Menu Icons */
16px × 16px (w-4 h-4)

/* Header Mobile Menu */
24px × 24px (w-6 h-6)

/* Header Search Icon */
16px × 16px (w-4 h-4)

/* Header Notification Bell */
20px × 20px (w-5 h-5)

/* Stats Card Icons */
24px × 24px (w-6 h-6)
```

## Typography Scale

```
Display (Hero): 48px / 3rem - font-bold
H1 (Page Title): 30px / 1.875rem - font-bold (desktop)
                 24px / 1.5rem - font-bold (mobile)
H2 (Card Title): 20px / 1.25rem - font-semibold
H3 (Section): 18px / 1.125rem - font-semibold
Body: 16px / 1rem - font-normal
Small: 14px / 0.875rem - font-medium
Tiny: 12px / 0.75rem - font-semibold (uppercase for labels)
```

## Implementation Checklist

- [x] Sidebar with navy blue background (#1E293B)
- [x] Teal accent color for active states (#14B8A6)
- [x] Logo with brand badge
- [x] Quick action button with gradient
- [x] Grouped navigation sections (MAIN, WORK, BUSINESS)
- [x] Expandable navigation items
- [x] Badge support for notifications
- [x] User profile footer with dropdown
- [x] Sticky header with shadow
- [x] Mobile menu with overlay
- [x] Search bar (desktop only)
- [x] Notification bell with indicator
- [x] Responsive layout (mobile to desktop)
- [x] Smooth animations
- [x] Active route highlighting
- [x] WCAG AA color contrast
- [x] Keyboard accessible
- [x] Screen reader friendly

## Testing Viewport Sizes

```
iPhone SE: 375px × 667px
iPhone 14 Pro: 393px × 852px
iPad: 768px × 1024px
MacBook: 1280px × 800px
Desktop: 1920px × 1080px
4K: 3840px × 2160px
```

Test at each breakpoint to ensure:
- Sidebar behavior is correct
- Header adapts properly
- Content is readable
- Cards flow naturally
- No horizontal scroll
