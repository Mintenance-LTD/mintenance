# JobDetailsProfessional - Design Showcase

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Jobs                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────┬─────────────────────────┐   │
│  │  MAIN CONTENT (8 cols)        │  SIDEBAR (4 cols)       │   │
│  │                               │                         │   │
│  │  ┌──────────────────────────┐ │  ┌──────────────────┐  │   │
│  │  │  [Photo Gallery]         │ │  │  BUDGET          │  │   │
│  │  │  Large hero image        │ │  │  £2,500          │  │   │
│  │  │  "View all 5 photos" →   │ │  │                  │  │   │
│  │  └──────────────────────────┘ │  └──────────────────┘  │   │
│  │                               │                         │   │
│  │  Kitchen Renovation           │  ┌──────────────────┐  │   │
│  │  [Open] [High Priority]       │  │  JOB DETAILS     │  │   │
│  │                               │  │  Status: Open    │  │   │
│  │  ┌────────┬────────┬────────┐ │  │  Category: ...   │  │   │
│  │  │📍 Loc  │🏷️ Cat  │📅 Date│ │  │  Posted: ...     │  │   │
│  │  └────────┴────────┴────────┘ │  │  Bids: 3         │  │   │
│  │                               │  └──────────────────┘  │   │
│  │  ┌──────────────────────────┐ │                         │   │
│  │  │  JOB DESCRIPTION         │ │  ┌──────────────────┐  │   │
│  │  │  Need complete kitchen   │ │  │  ACTIONS         │  │   │
│  │  │  renovation including... │ │  │  [Edit Job]      │  │   │
│  │  └──────────────────────────┘ │  │  [Contact]       │  │   │
│  │                               │  └──────────────────┘  │   │
│  │  ┌──────────────────────────┐ │                         │   │
│  │  │  PROPERTY INFORMATION    │ │  ┌──────────────────┐  │   │
│  │  │  🏠 123 Main Street      │ │  │  NEED HELP?      │  │   │
│  │  └──────────────────────────┘ │  │  Contact Support │  │   │
│  │                               │  └──────────────────┘  │   │
│  │  ┌──────────────────────────┐ │                         │   │
│  │  │  BIDS RECEIVED (3)       │ │  ← Sticky on scroll  │   │
│  │  │  ┌────────────────────┐  │ │                         │   │
│  │  │  │ 👤 John's Plumbing │  │ │                         │   │
│  │  │  │ £2,200             │  │ │                         │   │
│  │  │  │ [View] [Accept]    │  │ │                         │   │
│  │  │  └────────────────────┘  │ │                         │   │
│  │  └──────────────────────────┘ │                         │   │
│  │                               │                         │   │
│  └───────────────────────────────┴─────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Color Palette

### Primary Colors
```
Navy:    #1F2937 (Headings, primary text)
Mint:    #14B8A6 (Teal) - Primary actions, links
Gold:    #F59E0B (Amber) - Warnings, highlights
```

### Status Colors
```
Blue:    #3B82F6 - Posted/Open
Teal:    #14B8A6 - Assigned
Gold:    #F59E0B - In Progress
Purple:  #8B5CF6 - In Review
Green:   #10B981 - Completed
Gray:    #6B7280 - Cancelled
```

### Neutrals
```
Gray-50:  #F9FAFB (Light background)
Gray-100: #F3F4F6 (Card backgrounds)
Gray-200: #E5E7EB (Borders)
Gray-600: #4B5563 (Secondary text)
Gray-900: #111827 (Primary text)
White:    #FFFFFF (Cards, modals)
```

## Typography Hierarchy

```
Page Title (H1)
├─ Font: 30px (text-3xl)
├─ Weight: 600 (font-semibold)
├─ Color: Gray-900
└─ Line Height: 1.2

Section Title (H2)
├─ Font: 20px (text-xl)
├─ Weight: 600 (font-semibold)
├─ Color: Gray-900
└─ Margin Bottom: 24px

Card Title (H3)
├─ Font: 18px (text-lg)
├─ Weight: 600 (font-semibold)
└─ Color: Gray-900

Body Text
├─ Font: 16px (text-base)
├─ Weight: 400 (font-normal)
├─ Color: Gray-700
└─ Line Height: 1.625 (leading-relaxed)

Small Text
├─ Font: 14px (text-sm)
├─ Weight: 400 (font-normal)
└─ Color: Gray-600
```

## Component Specifications

### Hero Section
```
┌─────────────────────────────────────┐
│  [Photo - 320px height]             │
│  "View all 5 photos" button         │
├─────────────────────────────────────┤
│  Kitchen Renovation (H1)            │
│  [Open Badge] [High Priority Badge] │
│                                     │
│  ┌─────┬─────┬─────┐                │
│  │ 📍  │ 🏷️  │ 📅  │ Quick Info    │
│  └─────┴─────┴─────┘                │
└─────────────────────────────────────┘

Specs:
- Border: 1px solid #E5E7EB
- Border Radius: 12px (rounded-xl)
- Shadow: sm
- Padding: 32px (p-8)
- Background: White
```

### Budget Card (Sidebar)
```
┌──────────────────────┐
│ BUDGET               │
│ £2,500               │ ← 36px, bold, Navy
│ Total budget for ... │ ← 14px, Gray-600
└──────────────────────┘

Specs:
- Width: 100%
- Padding: 24px (p-6)
- Border: 1px solid #E5E7EB
- Sticky: top-6
```

### Status Badge
```
┌─────────────────┐
│ ✓ Open          │ ← Icon + Text
└─────────────────┘

States:
- Posted:     Blue bg, Blue text
- Assigned:   Teal bg, Teal text
- In Progress: Gold bg, Gold text
- Completed:  Green bg, Green text

Specs:
- Padding: 8px 12px (px-3 py-1)
- Border Radius: 9999px (rounded-full)
- Font Size: 14px (text-sm)
- Font Weight: 600 (font-semibold)
- Border: 1px solid (matching color)
```

### Action Buttons
```
Primary Button:
┌──────────────────────┐
│   Edit Job           │ ← White text
└──────────────────────┘
Background: Gradient (Teal-600 → Teal-700)
Hover: Teal-700 → Teal-800

Secondary Button:
┌──────────────────────┐
│   Contact            │ ← Navy text
└──────────────────────┘
Background: White
Border: 1px Gray-300
Hover: Gray-50 background

Specs:
- Padding: 12px 24px (px-6 py-3)
- Border Radius: 8px (rounded-lg)
- Font Weight: 600
- Transition: 200ms
```

### Bid Card
```
┌─────────────────────────────────────┐
│  👤 John's Plumbing      £2,200     │
│  ✓ Verified                          │
│  Bid submitted 2 hours ago          │
│                                     │
│  "I can complete this renovation    │
│  within 2 weeks with high-quality   │
│  materials..."                       │
│                                     │
│  [View Profile]  [Accept Bid]       │
└─────────────────────────────────────┘

Specs:
- Padding: 24px (p-6)
- Border: 1px Gray-200
- Border Radius: 12px
- Hover: Border → Teal-300, Shadow → md
```

### Info Item
```
┌────────┐
│  📍    │  Location
│        │  London, UK
└────────┘

Specs:
- Icon Container: 40px × 40px
- Icon Size: 20px (w-5 h-5)
- Background: White
- Border: 1px Gray-200
- Border Radius: 8px
```

## Layout Grid

### Desktop (≥1024px)
```
Container: max-w-7xl (1280px)
Padding: 24px (px-6)

Grid: 12 columns
├─ Main Content: 8 columns (col-span-8)
│  └─ Space between cards: 24px (space-y-6)
│
└─ Sidebar: 4 columns (col-span-4)
   ├─ Sticky: top-6
   └─ Space between cards: 24px (space-y-6)

Gap between columns: 32px (gap-8)
```

### Mobile (<1024px)
```
Single column layout
Full width cards
Sidebar appears below main content
Padding: 16px (px-4)
```

## Interaction States

### Button Hover
```
Transform: None (no scale)
Shadow: sm → md
Background: Darken 10%
Transition: 200ms ease-in-out
```

### Card Hover (Bid Cards)
```
Border: Gray-200 → Teal-300
Shadow: none → md
Transition: 200ms ease-in-out
```

### Link Hover
```
Color: Gray-600 → Teal-600
Transition: 200ms
```

## Responsive Breakpoints

```
Mobile:     < 640px  (1 column, full width)
Tablet:     640px+   (1 column, centered)
Desktop:    1024px+  (2 columns, 8-4 grid)
Wide:       1280px+  (Max width constrained)
```

## Accessibility Features

### Color Contrast
```
Text on White:
- Gray-900: 16.1:1 ✓ AAA
- Gray-700: 9.3:1  ✓ AAA
- Gray-600: 7.2:1  ✓ AA

Buttons:
- White on Teal-600: 4.8:1 ✓ AA
- Navy on White: 16.1:1 ✓ AAA
```

### Focus States
```
All interactive elements:
- Outline: 2px Teal-500
- Outline Offset: 2px
- Border Radius: Inherit
```

### Keyboard Navigation
```
Tab Order:
1. Back button
2. Edit job button (if available)
3. Photo gallery button
4. Sidebar action buttons
5. Bid cards (tab through each)
6. Contact buttons
```

## Animation Specifications

### Page Load
```
Fade In:
- Duration: 300ms
- Easing: ease-in-out
- Opacity: 0 → 1
```

### Image Lightbox
```
Open:
- Background: opacity 0 → 1
- Modal: scale(0.95) → scale(1)
- Duration: 300ms

Close:
- Reverse of open
```

### Button Press
```
Active State:
- Scale: 0.98
- Duration: 100ms
- Easing: ease-out
```

## Spacing System (4px base)

```
xs:  4px   (space-1)
sm:  8px   (space-2)
md:  16px  (space-4)
lg:  24px  (space-6)
xl:  32px  (space-8)
2xl: 48px  (space-12)
```

## Shadow System

```
sm:  0 1px 2px rgba(0,0,0,0.05)
md:  0 4px 6px rgba(0,0,0,0.1)
lg:  0 10px 15px rgba(0,0,0,0.1)
xl:  0 20px 25px rgba(0,0,0,0.1)
```

## Example Color Combinations

### Primary Action
```
Background: #14B8A6 (Teal-600)
Text: #FFFFFF (White)
Hover: #0D9488 (Teal-700)
```

### Status - Open
```
Background: #DBEAFE (Blue-100)
Text: #1E40AF (Blue-700)
Border: #93C5FD (Blue-200)
```

### Status - In Progress
```
Background: #FEF3C7 (Amber-100)
Text: #B45309 (Amber-700)
Border: #FCD34D (Amber-200)
```

### Status - Completed
```
Background: #D1FAE5 (Emerald-100)
Text: #047857 (Emerald-700)
Border: #6EE7B7 (Emerald-200)
```

## Print Styles (Future)

```css
@media print {
  .sticky { position: relative !important; }
  .shadow { box-shadow: none !important; }
  button { display: none; }
  a::after { content: " (" attr(href) ")"; }
}
```

## Browser Support

- Chrome/Edge: ✓ Latest 2 versions
- Firefox: ✓ Latest 2 versions
- Safari: ✓ Latest 2 versions
- Mobile Safari: ✓ iOS 14+
- Chrome Mobile: ✓ Latest

## Performance Metrics

- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Cumulative Layout Shift: < 0.1
- Largest Contentful Paint: < 2.5s

---

**Design System Version:** 1.0
**Last Updated:** December 2025
**Designer:** Mintenance UI Team
