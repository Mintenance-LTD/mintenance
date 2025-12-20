# Figma Design Navigation Guide

**Project:** Project Management Dashboard - FREE (Community)  
**Figma File:** `Al2PGzMQcEawnuIVfbZIHT`  
**Last Updated:** January 30, 2025

---

## Quick Navigation Links

### Main Pages/Canvases

1. **Dashboard View**
   - URL: `?node-id=0-1`
   - **What's here:** Full dashboard layout with sidebar, overview cards, project summary, progress charts
   - **Components:** All dashboard sections, metric cards, tables, charts

2. **Components Library**
   - URL: `?node-id=6-361`
   - **What's here:** Reusable UI components (icons, buttons, menu, tabs)
   - **Components:** Icon library, menu variants, button variants, tab components

---

## Design Structure Map

### 📁 Components Canvas (6-361)

```
Components/
├── 📦 Icons Frame (1:2009)
│   ├── Navigation Icons (22px)
│   │   ├── category-2
│   │   ├── briefcase
│   │   ├── task
│   │   ├── cpu-setting
│   │   ├── clock
│   │   ├── data
│   │   ├── people
│   │   ├── layer
│   │   └── setting-2
│   │
│   └── Action Icons
│       ├── plus-large (24px)
│       ├── chevron-left
│       ├── search-normal
│       ├── notification
│       ├── circle-question
│       ├── chart
│       ├── user
│       ├── arrow-up
│       └── arrow-down
│
├── 📦 Expand Tab Frame (1:2123)
│   ├── Active Tab (1:2127) - 160px × 48px
│   └── Inactive Tab (1:2124) - 160px × 48px
│
├── 📦 Collapse Tab Frame (1:2130)
│   ├── Active Tab (1:2133) - 48px × 48px
│   └── Inactive Tab (1:2131) - 48px × 48px
│
├── 📦 Menu Frame (1:2135)
│   ├── Expand Menu (1:2150) - 260px × 1024px
│   └── Collapse Menu (1:2136) - 108px × 1024px
│
└── 📦 Button Frame (1:2164)
    ├── Expand Button (1:2165) - 184px × 48px
    └── Collapse Button (1:2169) - 48px × 48px
```

### 📁 Dashboard Canvas (0:1)

```
Dashboard/
├── 🎨 Sidebar Menu (260px × 1080px)
│   ├── Create Button
│   └── Menu Items (9 items)
│
├── 🎨 Top Header Bar (1120px × 48px)
│   ├── Dashboard Title
│   ├── Search Bar
│   ├── Notification Icon
│   └── User Profile
│
└── 🎨 Content Area (1180px × 1080px)
    ├── 📊 Overview Section (1120px × 250px)
    │   ├── Section Header
    │   └── Metric Cards (4 cards)
    │       ├── Total Revenue
    │       ├── Projects
    │       ├── Time Spent
    │       └── Resources
    │
    ├── 📋 Project Summary (690px × 349px)
    │   ├── Section Header + Filters
    │   └── Data Table
    │       ├── Table Header
    │       └── Project Rows (5+ rows)
    │
    ├── 📈 Overall Progress (400px × 349px)
    │   ├── Section Header + Filter
    │   ├── Circular Progress Chart
    │   └── Progress Metrics Grid
    │
    ├── ✅ Today Task (690px × 291px)
    │   ├── Section Header
    │   ├── Filter Tabs
    │   └── Task List (5+ tasks)
    │
    └── 👥 Projects Workload (400px × 291px)
        ├── Section Header + Filter
        └── Team Workload Grid
```

---

## Key Components Breakdown

### 1. Menu System

**Location:** Components Canvas → Menu Frame  
**Variants:**
- **Expand Menu:** Full sidebar with text labels (260px wide)
- **Collapse Menu:** Icon-only sidebar (108px wide)

**Features:**
- Create New Project button
- 9 menu items with icons
- Active state highlighting
- Expand/collapse toggle

**Menu Items:**
1. Dashboard (category-2 icon)
2. Projects (briefcase icon)
3. Tasks (task icon)
4. Dashboard (cpu-setting icon) - *Note: duplicate name*
5. Time log (clock icon)
6. Resource mgnt (data icon)
7. Users (people icon)
8. Project template (layer icon)
9. Menu settings (setting-2 icon)

### 2. Button Components

**Location:** Components Canvas → Button Frame  
**Variants:**
- **Expand Button:** 184px × 48px with icon + text
- **Collapse Button:** 48px × 48px icon-only

**Usage:** Primary action buttons, menu toggle

### 3. Tab Components

**Location:** Components Canvas → Expand/Collapse Tab Frames  
**Variants:**
- **Expand Tabs:** 160px × 48px (active/inactive)
- **Collapse Tabs:** 48px × 48px (active/inactive)

**Usage:** Menu navigation items, filter tabs

### 4. Icon Library

**Location:** Components Canvas → Icons Frame  
**Sizes:**
- Standard: 22px × 22px
- Large: 24px × 24px
- Small: 14px × 14px

**Categories:**
- Navigation icons
- Action icons
- Status icons

### 5. Metric Cards

**Location:** Dashboard Canvas → Overview Section  
**Dimensions:** 268px × 196px each  
**Structure:**
- Icon container (46px × 46px)
- Title text (16px)
- Value text (32px)
- Change indicator (14px icon + 12px text)

### 6. Data Table

**Location:** Dashboard Canvas → Project Summary Section  
**Structure:**
- Header row with 5 columns
- Data rows (32px height each)
- Status badges
- Progress indicators

**Columns:**
1. Name
2. Project Manager
3. Due Date
4. Status
5. Progress

### 7. Progress Chart

**Location:** Dashboard Canvas → Overall Progress Section  
**Type:** Circular progress indicator  
**Size:** 298px diameter  
**Features:**
- Large percentage display (32px)
- Label text (16px)
- Metrics grid below

### 8. Task List

**Location:** Dashboard Canvas → Today Task Section  
**Structure:**
- Filter tabs at top
- Task items (24px height each)
- Status badges
- Checkbox icons

**Filter Tabs:**
- All (count: 10)
- Important
- Notes (count: 05)
- Links (count: 10)

### 9. Workload Grid

**Location:** Dashboard Canvas → Projects Workload Section  
**Type:** Calendar/grid layout  
**Features:**
- Team member avatars (30px)
- Workload visualization
- Date labels

---

## Design Specifications Reference

### Spacing System
- **Base Unit:** 8px grid
- **Standard Gaps:** 10px, 16px
- **Section Padding:** 18px
- **Card Padding:** 18px

### Typography
- **Font:** Aeonik Pro TRIAL (Regular)
- **Body:** 14px, 16px
- **Headings:** 18px, 20px, 24px, 32px
- **Micro:** 10px, 12px

### Border Radius
- **Buttons/Tabs:** 24px
- **Collapse Tabs:** 30px
- **Badges:** 12px

### Icon Sizes
- **Standard:** 22px × 22px
- **Large:** 24px × 24px
- **Small:** 14px × 14px

---

## Implementation Priority

### Phase 1: Foundation
1. ✅ Design specifications extracted
2. ✅ Layout specifications documented
3. ⏭️ Icon system setup
4. ⏭️ Typography system
5. ⏭️ Spacing system

### Phase 2: Core Components
1. ⏭️ Icon component
2. ⏭️ Button component
3. ⏭️ Badge component
4. ⏭️ MenuTab component
5. ⏭️ Menu component

### Phase 3: Layout Components
1. ⏭️ Sidebar layout
2. ⏭️ Dashboard header
3. ⏭️ Section container
4. ⏭️ Card component
5. ⏭️ Table component

### Phase 4: Dashboard Sections
1. ⏭️ Overview section
2. ⏭️ Project Summary section
3. ⏭️ Progress Chart section
4. ⏭️ Task List section
5. ⏭️ Workload section

### Phase 5: Pages
1. ⏭️ Dashboard page
2. ⏭️ Projects page
3. ⏭️ Tasks page
4. ⏭️ Settings page

---

## Documentation Files

1. **FIGMA_DESIGN_SPECIFICATIONS.md**
   - Component-level specifications
   - Typography, spacing, dimensions
   - Component structure

2. **FIGMA_DASHBOARD_LAYOUT_SPECS.md**
   - Dashboard layout specifications
   - Section dimensions and positioning
   - Grid system and spacing

3. **FIGMA_DESIGN_EXPLORATION.md**
   - Complete design exploration
   - Component relationships
   - Implementation checklist

4. **FIGMA_NAVIGATION_GUIDE.md**
   - This file
   - Quick navigation reference
   - Structure map

---

## Figma URLs

### Main Access
- **Base URL:** `https://www.figma.com/design/Al2PGzMQcEawnuIVfbZIHT/Project-Management-Dashboard---FREE--Community-`

### Direct Links
- **Components:** `?node-id=6-361`
- **Dashboard:** `?node-id=0-1`

### Full URLs
- Components: `https://www.figma.com/design/Al2PGzMQcEawnuIVfbZIHT/Project-Management-Dashboard---FREE--Community-?node-id=6-361&p=f`
- Dashboard: `https://www.figma.com/design/Al2PGzMQcEawnuIVfbZIHT/Project-Management-Dashboard---FREE--Community-?node-id=0-1&p=f`

---

## Tips for Navigation

### In Figma:
1. **Use Layers Panel** (left sidebar) to navigate component hierarchy
2. **Use Pages Panel** to switch between Dashboard and Components
3. **Right-click components** to see all instances and variants
4. **Use Inspect Panel** to see exact measurements and properties
5. **Use Assets Panel** to see all reusable components

### For Development:
1. **Start with Components** - Build reusable components first
2. **Follow the Hierarchy** - Build from smallest to largest
3. **Reference Specifications** - Use the markdown docs for exact values
4. **Test Responsive** - Consider how components adapt
5. **Extract Assets** - Download icons and images

---

## Component Dependencies

```
Icon Component
    ↓
Button Component
    ↓
MenuTab Component
    ↓
Menu Component
    ↓
Sidebar Layout
    ↓
Dashboard Layout
```

### Building Order:
1. Icons (foundation)
2. Buttons (uses icons)
3. Tabs (uses icons)
4. Menu (uses tabs and buttons)
5. Layout (uses menu)
6. Sections (uses layout and components)

---

## Quick Reference: Measurements

### Menu
- Expanded: 260px × 1024px
- Collapsed: 108px × 1024px
- Item height: 48px
- Gap: 10px

### Buttons
- Expand: 184px × 48px
- Collapse: 48px × 48px
- Radius: 24px

### Cards
- Metric: 268px × 196px
- Section: Variable × 349px/291px
- Padding: 18px

### Icons
- Standard: 22px × 22px
- Large: 24px × 24px
- Small: 14px × 14px

### Typography
- Body: 14px, 16px
- Heading: 18px
- Large: 32px

---

## Status

✅ **Design Exploration:** Complete  
✅ **Specifications:** Documented  
✅ **Layout Analysis:** Complete  
⏭️ **Implementation:** Ready to begin

---

**Last Updated:** January 30, 2025  
**Next Steps:** Begin component implementation

