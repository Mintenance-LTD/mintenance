# Figma Design Exploration Guide

**Source:** Figma Design - Project Management Dashboard (FREE Community)  
**File Key:** `Al2PGzMQcEawnuIVfbZIHT`  
**Components Canvas:** `6-361`  
**Dashboard Canvas:** `0:1`  
**Date:** January 30, 2025

---

## Design Structure Overview

This Figma design contains a complete Project Management Dashboard with multiple pages, components, and design tokens. Based on the exploration, here's the structure:

### Main Canvases/Pages

1. **Dashboard Page** (`node-id=0:1`)
   - Main dashboard view with sidebar, overview cards, project summary, progress charts
   - Contains all the main dashboard sections

2. **Components Page** (`node-id=6:361`)
   - Component library with reusable UI elements
   - Icons, buttons, menu components, tabs

---

## Components Library (Node 6-361)

### Icon Components

Located in the `icons` frame (`1:2009`), containing:

#### Navigation Icons (22px × 22px)
- **category-2** - Dashboard/Category icon
- **briefcase** - Projects icon  
- **task** - Tasks icon
- **cpu-setting** - Settings/Dashboard icon
- **clock** - Time log icon
- **data** - Resource management icon
- **people** - Users/Team icon
- **layer** - Project template icon
- **setting-2** - Menu settings icon

#### Action Icons
- **plus-large** (24px × 24px) - Create/Add action
- **chevron-left** (22px × 22px) - Navigation/Back
- **search-normal** (22px × 22px) - Search
- **notification** (22px × 22px) - Notifications
- **circle-question** (24px × 24px) - Help/Info
- **chart** (22px × 22px) - Analytics
- **user** (22px × 22px) - User profile
- **arrow-up** (22px × 22px) - Increase/Up
- **arrow-down** (22px × 22px) - Decrease/Down

### Menu Components

#### Expand Menu (`1:2150`)
- **Dimensions:** 260px × 1024px
- **State:** Expanded with full text labels
- **Features:**
  - Create New Project button at top
  - Full menu items with icons and labels
  - Collapse indicator button

#### Collapse Menu (`1:2136`)
- **Dimensions:** 108px × 1024px  
- **State:** Collapsed, icons only
- **Features:**
  - Icon-only menu items
  - Compact layout
  - Expand indicator button

### Menu Tab Components

#### Expand Tab - Active (`1:2127`)
- **Dimensions:** 160px × 48px (or 184px for selected)
- **Features:** Icon + text label
- **Usage:** Active menu item in expanded menu

#### Expand Tab - Inactive (`1:2124`)
- **Dimensions:** 160px × 48px
- **Features:** Icon + text label
- **Usage:** Inactive menu item in expanded menu

#### Collapse Tab - Active (`1:2133`)
- **Dimensions:** 48px × 48px
- **Features:** Icon only with background highlight
- **Usage:** Active menu item in collapsed menu

#### Collapse Tab - Inactive (`1:2131`)
- **Dimensions:** 48px × 48px
- **Features:** Icon only, no background
- **Usage:** Inactive menu item in collapsed menu

### Button Components

#### Expand Button (`1:2165`)
- **Dimensions:** 184px × 48px
- **Features:** Icon + "Create new project" text
- **Border Radius:** 24px
- **Usage:** Primary action button in expanded menu

#### Collapse Button (`1:2169`)
- **Dimensions:** 48px × 48px
- **Features:** Icon only
- **Border Radius:** 24px
- **Usage:** Primary action button in collapsed menu

---

## Dashboard Page Structure (Node 0:1)

### Layout Components

#### Sidebar Menu
- **Width:** 260px (expanded) / 80px (collapsed)
- **Height:** 1080px (full viewport)
- **Position:** Fixed left side
- **Components Used:** Menu component from library

#### Top Header Bar
- **Width:** 1120px
- **Height:** 48px
- **Components:**
  - Dashboard title
  - Search bar
  - Notification icon
  - User profile dropdown

#### Content Area
- **Width:** 1180px (1440px - 260px sidebar)
- **Height:** 1080px
- **Sections:** Multiple dashboard sections

### Dashboard Sections

#### 1. Overview Section
**Position:** Top of content area (114px from top)  
**Dimensions:** 1120px × 250px

**Components:**
- Section header with "Overview" title
- Time range selector dropdown
- Four metric cards in a row:
  1. Total Revenue card
  2. Projects card
  3. Time Spent card
  4. Resources card

**Card Structure:**
- Icon container (46px × 46px)
- Title text (16px font)
- Value text (32px font)
- Change indicator with icon and percentage

#### 2. Project Summary Section
**Position:** Left side, below overview (394px from top)  
**Dimensions:** 690px × 349px

**Components:**
- Section header with "Project summary" title
- Filter dropdowns (Project, Project Manager, Status)
- Data table with columns:
  - Name
  - Project Manager
  - Due Date
  - Status (with badges)
  - Progress (circular indicator)

**Table Features:**
- Multiple project rows
- Status badges (Completed, Delayed, At Risk, On going)
- Progress indicators (circular, showing percentage)

#### 3. Overall Progress Section
**Position:** Right side, below overview (394px from top)  
**Dimensions:** 400px × 349px

**Components:**
- Section header with "Overall Progress" title
- Filter dropdown ("All")
- Large circular progress chart (298px diameter)
- Progress percentage display (72%)
- Progress metrics grid:
  - Total projects (95)
  - Completed (26)
  - Delayed (35)
  - On going (35)

#### 4. Projects Workload Section
**Position:** Right side, below progress (773px from top)  
**Dimensions:** 400px × 291px

**Components:**
- Section header with "Projects Workload" title
- Time range selector ("Last 3 months")
- Team member workload grid/calendar
- Avatar circles (30px diameter)
- Team member names
- Workload visualization

#### 5. Today Task Section
**Position:** Left side, below project summary (773px from top)  
**Dimensions:** 690px × 291px

**Components:**
- Section header with "Today task" title
- Filter tabs:
  - All (with count badge: 10)
  - Important
  - Notes (with count badge: 05)
  - Links (with count badge: 10)
- Task list with items showing:
  - Checkbox/icon
  - Task description
  - Status badge (Approved, In review, On going)

---

## Design Patterns Identified

### Card Pattern
**Structure:**
- Container with padding (18px)
- Icon section (46px × 46px)
- Content section with title and value
- Footer section with change indicator

**Usage:** Metric cards, section containers

### Badge Pattern
**Structure:**
- Pill-shaped container (border radius: 12px)
- Height: 24px
- Padding: 8px horizontal, 5px vertical
- Font size: 14px

**Variants:**
- Status badges (Completed, Delayed, At Risk, On going, Approved, In review)
- Count badges (for filters/tabs)

### Table Pattern
**Structure:**
- Header row with column labels
- Data rows (32px height each)
- Columns: Name, Manager, Date, Status, Progress
- Status column uses badges
- Progress column uses circular indicators

### Progress Indicator Pattern
**Structure:**
- Circular progress ring
- Center text with percentage (32px font)
- Label below (16px font)
- Metrics grid below chart

### Filter/Dropdown Pattern
**Structure:**
- Container: 34px height
- Text label + chevron icon
- Border radius: Inherited from design system
- Padding: 14px horizontal, 9px vertical

---

## Navigation Structure

### Menu Items (in order)
1. **Dashboard** - category-2 icon
2. **Projects** - briefcase icon
3. **Tasks** - task icon
4. **Dashboard** (duplicate) - cpu-setting icon
5. **Time log** - clock icon
6. **Resource mgnt** - data icon
7. **Users** - people icon
8. **Project template** - layer icon
9. **Menu settings** - setting-2 icon

### Interactive Elements
- **Create New Project Button** - Top of menu
- **Menu Expand/Collapse** - Toggle button
- **Active Menu Item** - Highlighted background
- **Filter Dropdowns** - In section headers
- **Tab Filters** - In Today Task section

---

## Responsive Behavior

### Breakpoints (Inferred)
- **Desktop:** ≥ 1440px - Full layout with expanded sidebar
- **Tablet:** 768px - 1023px - Collapsed sidebar
- **Mobile:** < 768px - Stacked layout

### State Changes
- **Sidebar:** Expands/collapses between 260px and 108px
- **Menu Items:** Show/hide text labels
- **Cards:** Stack vertically on smaller screens
- **Tables:** Horizontal scroll or stack on mobile

---

## Component Relationships

### Parent-Child Hierarchy

```
Dashboard (0:1)
├── Sidebar Menu
│   ├── Create Button (uses Button component)
│   └── Menu Items (uses MenuTab components)
│       └── Icons (uses Icon components)
│
└── Content Area
    ├── Header Bar
    ├── Overview Section
    │   └── Metric Cards (4x)
    ├── Main Content Row
    │   ├── Project Summary Section
    │   │   └── Data Table
    │   └── Overall Progress Section
    │       └── Progress Chart
    └── Bottom Content Row
        ├── Today Task Section
        │   └── Task List
        └── Projects Workload Section
            └── Workload Grid
```

### Component Library Structure

```
Components (6-361)
├── Icons Frame
│   └── Icon Symbols (various types)
├── Expand Tab Frame
│   ├── Active Tab
│   └── Inactive Tab
├── Collapse Tab Frame
│   ├── Active Tab
│   └── Inactive Tab
├── Menu Frame
│   ├── Expand Menu
│   └── Collapse Menu
└── Button Frame
    ├── Expand Button
    └── Collapse Button
```

---

## Design Token System

### Spacing Scale
Based on 8px grid system:
- 4px - Micro spacing
- 5px - Icon padding
- 8px - Small gap
- 10px - Standard gap
- 13px - Tab padding
- 14px - Tab padding
- 16px - Icon-text gap
- 18px - Section padding
- 20px - Button padding
- 24px - Border radius
- 30px - Side padding
- 46px - Right padding
- 60px - Section gap
- 140px - Top padding

### Typography Scale
- 10px - Micro text (progress percentages)
- 12px - Small text (change indicators)
- 14px - Body text, labels, menu items
- 16px - Standard text, table content
- 18px - Section titles
- 20px - Major headings
- 24px - Large headings
- 32px - Extra large (metric values, progress)

### Border Radius Scale
- 12px - Badges (pill-shaped)
- 17px - Notification badges
- 24px - Buttons, tabs, containers
- 30px - Collapse tabs

### Icon Size Scale
- 14px - Indicator icons
- 22px - Standard icons
- 24px - Large icons (primary actions)

---

## Implementation Checklist

### Components to Build
- [ ] Icon component system
- [ ] Menu component (expand/collapse states)
- [ ] MenuTab component (expand/collapse, active/inactive)
- [ ] Button component (expand/collapse variants)
- [ ] Metric Card component
- [ ] Badge component (status variants)
- [ ] Table component
- [ ] Progress Chart component (circular)
- [ ] Dropdown/Select component
- [ ] Tab Filter component
- [ ] Task List Item component

### Layout Components
- [ ] Sidebar layout
- [ ] Dashboard header
- [ ] Section container
- [ ] Card grid layout
- [ ] Table layout
- [ ] Progress section layout

### Pages to Build
- [ ] Dashboard page (main view)
- [ ] Projects page
- [ ] Tasks page
- [ ] Team/Users page
- [ ] Settings page

---

## Asset Management

### Icon Assets
All icons are available via Figma API URLs (7-day expiration):
- Download and host locally for production
- Consider using an icon library (Lucide, Heroicons) for better performance
- Maintain exact sizes: 14px, 22px, 24px

### Image Assets
- Avatar images (team members)
- Logo/branding assets
- Any background images

### Font Assets
- **Aeonik Pro TRIAL** - Primary font
- Need to license or find alternative
- Consider: Inter, Roboto, or similar sans-serif

---

## Next Steps

1. **Component Library Setup**
   - Create component directory structure
   - Set up icon system
   - Build base components (Button, Badge, Card)

2. **Layout System**
   - Implement sidebar component
   - Create dashboard layout wrapper
   - Build responsive grid system

3. **Dashboard Sections**
   - Build Overview section with metric cards
   - Implement Project Summary table
   - Create Progress Chart component
   - Build Task List component
   - Implement Workload visualization

4. **State Management**
   - Menu expand/collapse state
   - Active menu item tracking
   - Filter states
   - Data fetching for dashboard content

5. **Styling System**
   - Set up design tokens (spacing, typography, etc.)
   - Create utility classes or CSS variables
   - Implement responsive breakpoints
   - Add hover/focus states

---

## Design Files Reference

### Figma URLs
- **Components:** `https://www.figma.com/design/Al2PGzMQcEawnuIVfbZIHT/Project-Management-Dashboard---FREE--Community-?node-id=6-361`
- **Dashboard:** `https://www.figma.com/design/Al2PGzMQcEawnuIVfbZIHT/Project-Management-Dashboard---FREE--Community-?node-id=0-1`

### Documentation Files
- `FIGMA_DESIGN_SPECIFICATIONS.md` - Component specifications
- `FIGMA_DASHBOARD_LAYOUT_SPECS.md` - Layout specifications
- `FIGMA_DESIGN_EXPLORATION.md` - This file

---

**Last Updated:** January 30, 2025  
**Status:** Exploration Complete - Ready for Implementation

