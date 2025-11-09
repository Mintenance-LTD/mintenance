# Figma Design Specifications - Project Management Dashboard

**Source:** Figma Design - Project Management Dashboard (FREE Community)  
**File Key:** `Al2PGzMQcEawnuIVfbZIHT`  
**Components Canvas Node:** `6-361`  
**Extracted Date:** January 30, 2025

**Note:** Colors are excluded from this document as requested. Only structural, typographic, spacing, and layout specifications are included.

---

## Table of Contents

1. [Typography System](#typography-system)
2. [Spacing System](#spacing-system)
3. [Component Specifications](#component-specifications)
4. [Layout Dimensions](#layout-dimensions)
5. [Border Radius](#border-radius)
6. [Shadows & Effects](#shadows--effects)
7. [Icon Specifications](#icon-specifications)
8. [Component Structure](#component-structure)

---

## Typography System

### Font Family
- **Primary Font:** `Aeonik Pro TRIAL` (Regular weight)
- **Fallback:** `sans-serif`

### Font Sizes
- **14px** - Standard body text, menu items, labels
- **16px** - Larger labels, secondary text
- **18px** - Section headers
- **20px** - Major headings
- **24px** - Large headings
- **32px** - Extra large headings

### Font Weights
- **Regular (400)** - Default weight for most text
- Used in: Menu items, body text, labels, buttons

### Line Height
- **Normal** - Default line height (1.0)
- Used for: All text elements

### Text Alignment
- **Left** - Default for all text
- **Center** - Used in circular progress indicators

### Text Transform
- **None** - All text uses original casing
- **Nowrap** - Applied to button text and labels

---

## Spacing System

### Base Unit
The design follows an **8px grid system** for consistent spacing.

### Padding Values

#### Menu Components
- **Collapse Menu:**
  - Top padding: `140px`
  - Horizontal padding: `30px` (left), `30px` (right)
  - Bottom padding: `0px`
  - Gap between items: `60px`

- **Expand Menu:**
  - Top padding: `140px`
  - Left padding: `30px`
  - Right padding: `46px`
  - Bottom padding: `0px`
  - Gap between items: `60px`

#### Menu Items
- **Expand Tab:**
  - Horizontal padding: `16px` (left), `26px` (right)
  - Vertical padding: `13px`
  - Gap between icon and text: `16px`

- **Collapse Tab:**
  - Horizontal padding: `13px`
  - Vertical padding: `16px`

#### Buttons
- **Expand Button:**
  - Horizontal padding: `7px` (left), `20px` (right)
  - Vertical padding: `5px`
  - Internal gap: `10px` (between icon and text)

- **Collapse Button:**
  - Padding: `5px` (all sides)

#### Icon Containers
- **Icon padding:** `5px` (for icon buttons)

### Margin Values

#### Menu Item Spacing
- **Gap between menu items:** `10px`
- **Menu sections gap:** `60px`

### Gap Values (Flexbox/Grid)
- **Menu items:** `10px`
- **Button content:** `10px` or `16px` (depending on context)
- **Icon groups:** `10px`

---

## Component Specifications

### Menu Component

#### Expand Menu
- **Width:** `260px`
- **Height:** `1024px`
- **Background:** (Excluded - color)
- **Border Radius:** None (sharp corners)
- **Position:** Absolute or fixed positioning

#### Collapse Menu
- **Width:** `108px` (approximate, based on icon-only layout)
- **Height:** `1024px`
- **Background:** (Excluded - color)
- **Border Radius:** None (sharp corners)

#### Menu Items Container
- **Layout:** Flexbox column
- **Alignment:** Start (left-aligned)
- **Gap:** `10px` between items

### Button Component

#### Expand Button (Create New Project)
- **Width:** `184px`
- **Height:** `48px`
- **Border Radius:** `24px` (fully rounded)
- **Layout:** Flexbox row
- **Alignment:** Center aligned items
- **Gap:** `10px`

#### Collapse Button (Icon Only)
- **Width:** `48px`
- **Height:** `48px`
- **Border Radius:** `24px` (fully rounded)
- **Layout:** Flexbox center

### Menu Tab Components

#### Expand Tab (Active)
- **Width:** `184px` (for full menu)
- **Height:** `48px`
- **Border Radius:** `24px` (fully rounded)
- **Padding:** `13px` vertical, `16px` left, `26px` right
- **Layout:** Flexbox row
- **Gap:** `16px` (between icon and text)

#### Expand Tab (Inactive)
- **Width:** `160px`
- **Height:** `48px`
- **Border Radius:** `24px` (fully rounded)
- **Padding:** `13px` vertical, `16px` left, `26px` right
- **Layout:** Flexbox row
- **Gap:** `16px`

#### Collapse Tab (Active)
- **Width:** `48px`
- **Height:** `48px`
- **Border Radius:** `30px` (fully rounded, slightly more than standard)
- **Padding:** `13px` horizontal, `16px` vertical

#### Collapse Tab (Inactive)
- **Width:** `48px`
- **Height:** `48px`
- **Border Radius:** `30px`
- **Padding:** `13px` horizontal, `16px` vertical

### Icon Component

#### Standard Icon Size
- **Width:** `22px`
- **Height:** `22px`
- **Display:** Relative positioning

#### Large Icon Size (Plus Icon)
- **Width:** `24px`
- **Height:** `24px`
- **Display:** Relative positioning

#### Icon Stroke/Outline
- **Stroke width:** Variable (depends on icon type)
- **Fill:** (Excluded - color)
- **Stroke:** (Excluded - color)

---

## Layout Dimensions

### Dashboard Layout

#### Main Dashboard Frame
- **Width:** `1440px`
- **Height:** `1080px`
- **Position:** Absolute positioning

#### Sidebar Menu
- **Expanded Width:** `260px`
- **Collapsed Width:** `108px` (approximate)
- **Height:** `1024px` (full viewport height)

#### Content Area
- **Width:** `1180px` (1440px - 260px sidebar)
- **Height:** `1080px`

### Component Frames

#### Icon Frame Container
- **Width:** `416px`
- **Height:** `116px`
- **Position:** Canvas-based positioning

#### Expand Tab Container
- **Width:** `241px`
- **Height:** `168px`

#### Collapse Tab Container
- **Width:** `88px`
- **Height:** `156px`

#### Menu Container
- **Width:** `770px` (contains both expand and collapse variants)
- **Height:** `1078px`

#### Button Container
- **Width:** `221px`
- **Height:** `156px`

---

## Border Radius

### Standard Radius Values

#### Fully Rounded (Pills)
- **24px** - Used for:
  - Buttons (expand and collapse)
  - Menu tabs (expand tabs)
  - Icon button containers

#### Extra Rounded
- **30px** - Used for:
  - Collapse tabs (both active and inactive states)

#### Medium Rounded
- **17px** - Used for:
  - Notification badges or indicators

### Application Rules
- **Buttons:** Always `24px` border radius (fully rounded)
- **Menu Tabs:** `24px` for expand tabs, `30px` for collapse tabs
- **Icon Containers:** `24px` when part of buttons
- **Notification Badges:** `17px` (based on design context)

---

## Shadows & Effects

### Shadow Specifications

#### Menu Collapse Indicator Shadow
- **Shadow:** `2px 2px 8px 0px rgba(0,0,0,0.1)`
- **X-offset:** `2px`
- **Y-offset:** `2px`
- **Blur:** `8px`
- **Spread:** `0px`
- **Color:** (Excluded - uses rgba with opacity)

#### Application
- Applied to: Notification badges, collapse indicators, floating elements
- Purpose: Create depth and separation from background

### Opacity Values
- **0.1** - Shadow opacity (10%)
- Used for: Subtle elevation effects

---

## Icon Specifications

### Icon Sizes

#### Standard Icons (Menu Items)
- **Size:** `22px × 22px`
- **Usage:** Dashboard, Projects, Tasks, Settings, etc.

#### Large Icons
- **Size:** `24px × 24px`
- **Usage:** Plus icon for "Create new project" button

#### Small Icons (Indicators)
- **Size:** `14px × 14px`
- **Usage:** Chevron icons, collapse indicators

### Icon Types Available

#### Menu Navigation Icons
1. **category-2** - Dashboard icon
2. **briefcase** - Projects icon
3. **task** - Tasks icon
4. **cpu-setting** - Dashboard/Settings icon
5. **clock** - Time log icon
6. **data** - Resource management icon
7. **people** - Users icon
8. **layer** - Project template icon
9. **setting-2** - Menu settings icon

#### Action Icons
1. **plus-large** - Create/add action
2. **chevron-left** - Navigation/back
3. **search-normal** - Search functionality
4. **notification** - Notifications
5. **circle-question** - Help/info
6. **chart** - Analytics/reports
7. **user** - User profile
8. **arrow-up** - Increase/up
9. **arrow-down** - Decrease/down

### Icon Spacing
- **Icon to Text Gap:** `16px` (in expand menu items)
- **Icon Container Padding:** `5px` (for icon buttons)
- **Icon Group Gap:** `10px` (when icons are grouped)

### Icon Positioning
- **Absolute positioning:** Used for icon containers
- **Relative positioning:** Used for icon elements
- **Centered:** Icons are center-aligned within containers

---

## Component Structure

### Menu Component Hierarchy

```
Menu (property1: "expand menu" | "collapse menu")
├── Button (Create New Project / Collapse)
│   ├── Icon Container (24px × 24px)
│   │   └── Plus Icon
│   └── Text Container (14px font)
│       ├── "Create new"
│       └── "project"
│
└── Menu Items Container (flex-col, gap-10px)
    ├── Expand Tab / Collapse Tab
    │   ├── Icon (22px × 22px)
    │   └── Text (14px, optional)
    ├── Expand Tab / Collapse Tab
    │   └── ... (repeated for each menu item)
    └── ... (8-9 menu items total)
```

### Button Component Variants

#### Expand Button
```
Button (184px × 48px, rounded-24px)
├── Icon Button Container (rounded-24px, padding-5px)
│   └── Plus Icon (24px × 24px)
└── Text Container (14px font)
    ├── "Create new"
    └── "project"
```

#### Collapse Button
```
Button (48px × 48px, rounded-24px)
└── Icon Button Container (rounded-24px, padding-5px)
    └── Plus Icon (24px × 24px)
```

### Menu Tab Component Variants

#### Expand Tab (Active)
```
Tab (184px × 48px, rounded-24px, padding: 13px 26px 13px 16px)
├── Icon (22px × 22px)
└── Text (14px, font: Aeonik Pro TRIAL)
```

#### Expand Tab (Inactive)
```
Tab (160px × 48px, rounded-24px, padding: 13px 26px 13px 16px)
├── Icon (22px × 22px)
└── Text (14px, font: Aeonik Pro TRIAL)
```

#### Collapse Tab (Active)
```
Tab (48px × 48px, rounded-30px, padding: 16px 13px)
└── Icon (22px × 22px)
```

#### Collapse Tab (Inactive)
```
Tab (48px × 48px, rounded-30px, padding: 16px 13px)
└── Icon (22px × 22px)
```

---

## Layout Patterns

### Flexbox Usage

#### Menu Container
- **Display:** `flex`
- **Direction:** `column`
- **Alignment:** `items-start` (left-aligned)
- **Justify:** Default (flex-start)
- **Gap:** `10px` between items

#### Button Container
- **Display:** `flex`
- **Direction:** `row`
- **Alignment:** `items-center` (vertically centered)
- **Justify:** `justify-center` (for collapse) or `space-between` (for expand)
- **Gap:** `10px` or `16px` (depending on button type)

#### Menu Tab Container
- **Display:** `flex`
- **Direction:** `row`
- **Alignment:** `items-center`
- **Gap:** `16px` (between icon and text)

### Positioning

#### Absolute Positioning
- Used for: Icon containers, nested elements
- Reference: Parent container

#### Relative Positioning
- Used for: Icon elements, text containers
- Reference: Parent container

#### Fixed/Sticky Positioning
- Used for: Menu sidebar (stays fixed during scroll)
- Reference: Viewport

---

## Responsive Behavior

### Menu States

#### Expanded State
- **Width:** `260px`
- **Features:** Full text labels, icons, create button with text
- **Padding:** `30px` left, `46px` right

#### Collapsed State
- **Width:** `108px` (approximate)
- **Features:** Icons only, no text labels
- **Padding:** `30px` horizontal

### State Transitions
- **Smooth transitions** expected between states
- **Width animation** for menu expansion/collapse
- **Icon and text fade** during transition

---

## Accessibility Considerations

### Touch Target Sizes
- **Minimum:** `48px × 48px` (all interactive elements meet this)
- **Menu Items:** `48px` height (meets accessibility standard)
- **Buttons:** `48px` height (meets accessibility standard)

### Spacing for Touch
- **Gap between items:** `10px` (provides adequate separation)
- **Padding:** Sufficient padding for comfortable touch interaction

---

## Design System Summary

### Key Design Principles

1. **8px Grid System**
   - All spacing values are multiples of 8px or close variations
   - Ensures consistent rhythm throughout the design

2. **Rounded Corners**
   - Extensive use of rounded corners (`24px` standard, `30px` for tabs)
   - Creates soft, modern appearance

3. **Consistent Icon Sizing**
   - `22px` for standard icons
   - `24px` for primary action icons
   - `14px` for indicator icons

4. **Typography Hierarchy**
   - `14px` for all body text and labels
   - Consistent font family (Aeonik Pro TRIAL)
   - Regular weight throughout

5. **Spacing Rhythm**
   - `10px` gaps between menu items
   - `16px` gaps between icon and text
   - `60px` gaps between major sections

6. **Component Consistency**
   - All buttons: `48px` height
   - All menu items: `48px` height
   - All icons: `22px` or `24px` standard sizes

---

## Implementation Notes

### React/Next.js Conversion

The extracted code uses Tailwind CSS classes. When implementing:

1. **Convert to CSS Modules or Styled Components**
   - Maintain exact dimensions and spacing
   - Preserve layout patterns

2. **Component Structure**
   - Create reusable `Menu` component with `expand`/`collapse` prop
   - Create reusable `Button` component with variants
   - Create reusable `MenuTab` component with states

3. **Icon System**
   - Use SVG icons or icon library
   - Maintain exact sizes: `22px`, `24px`, `14px`
   - Ensure proper spacing and alignment

4. **State Management**
   - Menu expand/collapse state
   - Active menu item state
   - Hover states for interactive elements

5. **Responsive Behavior**
   - Implement smooth transitions
   - Handle mobile/tablet breakpoints
   - Maintain touch target sizes

---

## Asset References

### Icon Assets
All icons are available via Figma API URLs (valid for 7 days):
- Briefcase: `https://www.figma.com/api/mcp/asset/d43626f0-95bb-4d9b-bd77-ef93a57f8b00`
- Task: `https://www.figma.com/api/mcp/asset/8472d6a6-975f-4e7e-b07a-c5797588f6c0`
- CPU Setting: `https://www.figma.com/api/mcp/asset/071dc979-d40a-4b57-b9a4-551b8bc8d8d4`
- Clock: `https://www.figma.com/api/mcp/asset/a1718706-198c-4f39-ac55-8d87a712cc27`
- Data: `https://www.figma.com/api/mcp/asset/76035e8c-3aed-4f90-bb4f-4361f73f7d29`
- People: `https://www.figma.com/api/mcp/asset/de651566-8a21-41ed-9f13-e61832fece6c`
- Layer: `https://www.figma.com/api/mcp/asset/febd0268-ff3c-4afa-8452-33c9d20d8252`
- Setting: `https://www.figma.com/api/mcp/asset/169dc092-0b8b-42b8-85ed-4116dd7e7399`
- Category: `https://www.figma.com/api/mcp/asset/0e782b1c-5c2c-48ec-ad70-428181591930`
- Plus Large: `https://www.figma.com/api/mcp/asset/b5ebc9af-3b1c-4686-a9bb-956605403b38`
- Chevron: `https://www.figma.com/api/mcp/asset/3ece563f-42ee-4256-bc48-69e60fd7d85f`

**Note:** These URLs expire after 7 days. Download and host locally for production use.

---

## Component Code Structure

### TypeScript Interfaces

```typescript
interface MenuProps {
  property1?: "expand menu" | "collapse menu";
}

interface ButtonProps {
  property1?: "expand" | "collapse";
}

interface MenuTabProps {
  isActive?: boolean;
  isExpanded?: boolean;
  icon: string;
  label?: string;
  onClick?: () => void;
}

interface IconProps {
  className?: string;
  property1?: "linear";
  property2?: 
    | "briefcase" 
    | "category-2" 
    | "clock" 
    | "cpu-setting" 
    | "data" 
    | "layer" 
    | "people" 
    | "setting-2" 
    | "task" 
    | "plus-large" 
    | "chevron-left";
}
```

---

## Measurement Reference

### Pixel-Perfect Measurements

#### Menu
- Expanded width: `260px`
- Collapsed width: `108px` (approximate, icon-only)
- Height: `1024px`
- Top padding: `140px`
- Side padding: `30px` (left), `46px` (right expanded), `30px` (right collapsed)
- Item gap: `10px`
- Section gap: `60px`

#### Buttons
- Expand button: `184px × 48px`
- Collapse button: `48px × 48px`
- Border radius: `24px`
- Internal padding: `5px` (icon container)

#### Menu Tabs
- Expand tab width: `184px` (active) or `160px` (inactive)
- Tab height: `48px`
- Border radius: `24px` (expand), `30px` (collapse)
- Padding: `13px` vertical, `16px` left, `26px` right
- Icon-text gap: `16px`

#### Icons
- Standard: `22px × 22px`
- Large: `24px × 24px`
- Small: `14px × 14px`

---

## Design Tokens (Non-Color)

### Spacing Scale
```
4px   - Micro spacing (rare)
5px   - Icon button padding
8px   - Small gap
10px  - Standard gap (menu items, button content)
13px  - Tab padding (vertical/horizontal)
14px  - Tab padding (horizontal)
16px  - Icon-text gap, button content gap
20px  - Button right padding
24px  - Button border radius
26px  - Tab right padding
30px  - Tab border radius (collapse), menu side padding
46px  - Menu right padding (expanded)
60px  - Major section gap
140px - Menu top padding
```

### Border Radius Scale
```
17px - Notification badges
24px - Buttons, expand tabs, icon containers
30px - Collapse tabs
```

### Font Size Scale
```
14px - Body text, labels, menu items, buttons
16px - Larger labels
18px - Section headers
20px - Major headings
24px - Large headings
32px - Extra large headings
```

### Icon Size Scale
```
14px - Indicator icons (chevrons, arrows)
22px - Standard menu icons
24px - Primary action icons (plus)
```

### Shadow Scale
```
2px 2px 8px 0px rgba(0,0,0,0.1) - Standard elevation
```

---

## Summary

This document contains all design specifications extracted from the Figma Project Management Dashboard design, excluding color information as requested. All measurements, spacing, typography, component structures, and layout patterns are documented for implementation reference.

**Key Takeaways:**
- ✅ 8px grid system for spacing
- ✅ Consistent 48px height for interactive elements
- ✅ 24px border radius for buttons
- ✅ 22px standard icon size
- ✅ 14px font size for body text
- ✅ 10px gaps for menu items
- ✅ 16px gaps for icon-text spacing
- ✅ Flexbox-based layouts
- ✅ Accessibility-compliant touch targets

---

**Last Updated:** January 30, 2025  
**Source:** Figma Design - Project Management Dashboard (FREE Community)  
**Node ID:** 6-361 (Components Canvas)

