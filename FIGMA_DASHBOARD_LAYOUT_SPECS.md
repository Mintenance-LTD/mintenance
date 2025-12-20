# Figma Dashboard Layout Specifications

**Source:** Figma Design - Project Management Dashboard (FREE Community)  
**File Key:** `Al2PGzMQcEawnuIVfbZIHT`  
**Dashboard Canvas Node:** `0:1`  
**Extracted Date:** January 30, 2025

**Note:** Colors are excluded from this document. Only layout, dimensions, spacing, and structural specifications are included.

---

## Dashboard Overview

### Main Canvas Dimensions
- **Width:** `1440px`
- **Height:** `1080px`
- **Position:** Canvas-based layout

### Sidebar Menu
- **Width:** `260px` (expanded)
- **Width:** `80px` (collapsed, approximate)
- **Height:** `1080px` (full viewport)

### Content Area
- **Width:** `1180px` (1440px - 260px sidebar)
- **Height:** `1080px`

### Top Header Bar
- **Width:** `1120px`
- **Height:** `48px`
- **Position:** Top of content area
- **Padding:** `23px` vertical (top), `0px` bottom

---

## Section Layouts

### Overview Section

#### Container
- **Width:** `1120px`
- **Height:** `250px`
- **Position:** Below header bar
- **Top margin:** `114px` from top of content area
- **Padding:** `18px` (all sides, inferred from frame)

#### Section Header
- **Width:** `1120px`
- **Height:** `34px`
- **Layout:** Flexbox row
- **Justify:** Space between (title left, dropdown right)

#### Title
- **Text:** "Overview"
- **Font size:** `18px` (inferred from section header)
- **Weight:** Regular
- **Line height:** Normal

#### Time Range Selector
- **Width:** `135px`
- **Height:** `34px`
- **Border radius:** (inherited from dropdown component)
- **Position:** Right-aligned

#### Metric Cards Container
- **Width:** `1120px`
- **Height:** `196px`
- **Top margin:** `54px` (from section header)
- **Layout:** Flexbox row
- **Gap:** `16px` (between cards)

#### Metric Card Dimensions
- **Width:** `268px`
- **Height:** `196px`
- **Border radius:** (inherited from card component)
- **Padding:** `18px` (all sides)

#### Metric Card Content
- **Icon Container:**
  - Width: `46px`
  - Height: `46px`
  
- **Text Container:**
  - Width: `139px` (Total Revenue)
  - Width: `74px` (Projects)
  - Width: `138px` (Time Spent)
  - Width: `75px` (Resources)
  - Height: `58px`

- **Label:**
  - Font size: `16px`
  - Line height: Normal
  - Margin bottom: `26px` (to value)

- **Value:**
  - Font size: `32px` (inferred from large numbers)
  - Line height: Normal
  - Weight: Regular or Semi-bold

- **Change Indicator:**
  - Width: `174px`
  - Height: `14px`
  - Top margin: `134px` (from card top)
  - Font size: `12px` (inferred)
  - Icon size: `14px`

---

### Project Summary Section

#### Container
- **Width:** `690px`
- **Height:** `349px`
- **Position:** Left side, below overview
- **Top margin:** `394px` from top of content area
- **Padding:** `18px` (all sides)

#### Section Header
- **Width:** `654px` (container width - padding)
- **Height:** `34px`
- **Layout:** Flexbox row
- **Justify:** Space between

#### Title
- **Text:** "Project summary"
- **Font size:** `18px`
- **Weight:** Regular

#### Filter Controls
- **Width:** `364px`
- **Height:** `34px`
- **Layout:** Flexbox row
- **Gap:** (between filter dropdowns)

#### Filter Dropdowns
- **Project Dropdown:** `97px` width
- **Project Manager Dropdown:** `158px` width
- **Status Dropdown:** `93px` width
- **Height:** `34px` (all)

#### Table Container
- **Width:** `654px`
- **Height:** `302px`
- **Top margin:** `58px` (from section header)

#### Table Header
- **Width:** `654px`
- **Height:** `26px`
- **Layout:** Flexbox row
- **Border:** Bottom border (1px)

#### Table Header Columns
- **Name:** Width variable, left-aligned
- **Project Manager:** Width `106px`, centered at `241px` from left
- **Due Date:** Width `58px`, centered at `387px` from left
- **Status:** Width `41px`, centered at `491px` from left
- **Progress:** Width `56px`, right-aligned at `598px` from left
- **Font size:** `16px`
- **Weight:** Regular or Medium

#### Table Rows
- **Height:** `32px` per row
- **Spacing:** `0px` (rows are adjacent)
- **Padding:** `12px` vertical (inferred from text positioning)

#### Table Row Content
- **Project Name:**
  - Font size: `16px`
  - Left padding: `0px`
  - Width: Variable (up to `159px`)

- **Project Manager:**
  - Font size: `16px`
  - Left position: `241px`
  - Width: Variable (up to `103px`)

- **Due Date:**
  - Font size: `16px`
  - Left position: `387px`
  - Width: Variable (up to `84px`)

- **Status Badge:**
  - Width: `77px` (Completed)
  - Width: `60px` (Delayed)
  - Width: `67px` (On going)
  - Width: `50px` (At risk)
  - Height: `24px`
  - Border radius: `12px` (pill-shaped, inferred)
  - Padding: `8px` horizontal, `5px` vertical
  - Font size: `14px`

- **Progress Indicator:**
  - Width: `32px`
  - Height: `32px`
  - Position: Right-aligned at `610px` from left
  - Font size: `10px` (percentage text)

---

### Overall Progress Section

#### Container
- **Width:** `400px`
- **Height:** `349px`
- **Position:** Right side, below overview
- **Top margin:** `394px` from top of content area
- **Left margin:** `1010px` from left (sidebar + gap)
- **Padding:** `18px` (all sides)

#### Section Header
- **Width:** `364px` (container width - padding)
- **Height:** `34px`
- **Layout:** Flexbox row
- **Justify:** Space between

#### Title
- **Text:** "Overall Progress"
- **Font size:** `18px`
- **Weight:** Regular

#### Filter Dropdown
- **Width:** `67px`
- **Height:** `34px`
- **Position:** Right-aligned

#### Progress Chart Container
- **Width:** `364px`
- **Height:** `255px`
- **Top margin:** `58px` (from section header)

#### Circular Progress Chart
- **Width:** `347px`
- **Height:** `178px`
- **Position:** Centered horizontally
- **Top position:** `0px` (within container)

#### Progress Circle
- **Diameter:** `298px`
- **Stroke width:** Variable (depends on progress visualization)
- **Center:** Calculated within container

#### Progress Text
- **Percentage:**
  - Font size: `32px` (large, centered)
  - Position: Center of circle
  - Weight: Semi-bold or Bold

- **Label:**
  - Text: "Completed"
  - Font size: `16px`
  - Position: Below percentage
  - Top margin: `36px` from percentage

#### Progress Metrics Container
- **Width:** `364px`
- **Height:** `47px`
- **Top margin:** `208px` (from chart container top)
- **Layout:** Flexbox row
- **Gap:** `33.33px` (distributed evenly)

#### Progress Metric Items
- **Total Projects:**
  - Width: `85px`
  - Height: `47px`
  - Layout: Flexbox column

- **Completed:**
  - Width: `70px`
  - Height: `47px`

- **Delayed:**
  - Width: `51px`
  - Height: `47px`

- **On going:**
  - Width: `58px`
  - Height: `47px`

#### Progress Metric Text
- **Number:**
  - Font size: `25px`
  - Weight: Regular or Medium
  - Line height: Normal

- **Label:**
  - Font size: `16px`
  - Top margin: `31px` from number
  - Weight: Regular

---

### Projects Workload Section

#### Container
- **Width:** `400px`
- **Height:** `291px`
- **Position:** Right side, below progress section
- **Top margin:** `773px` from top of content area
- **Left margin:** `1010px` from left
- **Padding:** `18px` (all sides)

#### Section Header
- **Width:** `364px`
- **Height:** `34px`
- **Layout:** Flexbox row
- **Justify:** Space between

#### Title
- **Text:** "Projects Workload"
- **Font size:** `18px`
- **Weight:** Regular

#### Time Range Selector
- **Width:** `143px`
- **Height:** `34px`
- **Position:** Right-aligned

#### Workload Grid
- **Width:** `364px`
- **Height:** Variable (based on team members)
- **Layout:** Grid layout
- **Columns:** Variable (based on weeks/days)

#### Team Member Items
- **Avatar size:** `30px × 30px`
- **Text size:** `14px` (names)
- **Number size:** `16px` (dates/numbers)

---

### Today Task Section

#### Container
- **Width:** `690px`
- **Height:** `291px`
- **Position:** Left side, below project summary
- **Top margin:** `773px` from top of content area
- **Padding:** `18px` (all sides)

#### Section Header
- **Width:** `654px`
- **Height:** `34px`
- **Layout:** Flexbox row

#### Title
- **Text:** "Today task"
- **Font size:** `18px`
- **Weight:** Regular

#### Filter Tabs
- **Width:** `335px`
- **Height:** `18px`
- **Top margin:** `833px` from top (absolute)
- **Layout:** Flexbox row
- **Gap:** Variable (between tabs)

#### Filter Tab Items
- **All Tab:**
  - Width: `41px`
  - Height: `18px`
  - Badge width: `18px`
  - Badge height: `18px`

- **Important Tab:**
  - Width: `64px`
  - Height: `16px`

- **Notes Tab:**
  - Width: `64px`
  - Height: `18px`
  - Badge width: `18px`
  - Badge height: `18px`

- **Links Tab:**
  - Width: `58px`
  - Height: `18px`
  - Badge width: `18px`
  - Badge height: `18px`

#### Task List Container
- **Width:** `557px`
- **Height:** `160px`
- **Top margin:** `875px` from top (absolute)

#### Task Items
- **Height:** `24px` per task
- **Spacing:** `0px` (adjacent rows)
- **Layout:** Flexbox row
- **Justify:** Space between

#### Task Content
- **Checkbox/Icon:**
  - Width: `18px`
  - Height: `18px`

- **Task Text:**
  - Font size: `16px`
  - Left margin: `28px` (from icon)
  - Width: Variable (up to `360px`)

- **Status Badge:**
  - Width: `69px` (Approved)
  - Width: `64px` (In review)
  - Width: `67px` (On going)
  - Height: `24px`
  - Border radius: `12px` (pill-shaped)
  - Padding: `8px` horizontal, `5px` vertical
  - Font size: `14px`
  - Right-aligned

---

## Grid System

### Column Structure
- **Sidebar:** `260px` (fixed)
- **Content Area:** `1180px` (flexible)
- **Gap between sections:** `20px` (inferred from spacing)

### Row Structure
- **Header:** `48px` height
- **Overview:** `250px` height
- **Main Content:** `349px` height (Project Summary + Progress)
- **Bottom Sections:** `291px` height (Tasks + Workload)
- **Total Content Height:** `938px` (excluding header)

### Spacing Between Sections
- **Header to Overview:** `66px` (114px - 48px header)
- **Overview to Main:** `144px` (394px - 250px overview)
- **Main to Bottom:** `30px` (773px - 743px main bottom)

---

## Typography Specifications

### Heading Sizes
- **Page Title:** `36px` (inferred from "Dashboard" header)
- **Section Titles:** `18px`
- **Subsection Titles:** `16px`

### Body Text
- **Standard Text:** `16px`
- **Secondary Text:** `14px`
- **Small Text:** `12px`
- **Micro Text:** `10px` (progress percentages)

### Font Weights
- **Regular (400):** Default for all text
- **Medium (500):** Used for emphasis (inferred)
- **Semi-bold (600):** Used for headings (inferred)

### Line Heights
- **Normal:** Default (1.0)
- **Tight:** For compact layouts
- **Relaxed:** For readability (not explicitly specified)

---

## Component Dimensions Summary

### Cards
- **Metric Card:** `268px × 196px`
- **Section Card:** Variable width × `349px` or `291px` height
- **Padding:** `18px` (all sides)
- **Border radius:** (inherited from design system)

### Badges
- **Status Badge:** Variable width × `24px` height
- **Border radius:** `12px` (pill-shaped)
- **Padding:** `8px` horizontal, `5px` vertical
- **Font size:** `14px`

### Dropdowns
- **Standard Dropdown:** Variable width × `34px` height
- **Border radius:** (inherited from design system)
- **Padding:** `14px` horizontal, `9px` vertical (inferred)

### Tables
- **Table Row:** Full width × `32px` height
- **Cell Padding:** `12px` vertical (inferred)
- **Border:** `1px` bottom border on header

### Progress Indicators
- **Circular Progress:** `298px` diameter
- **Progress Text:** `32px` font size (percentage)
- **Progress Label:** `16px` font size

---

## Spacing System (Dashboard-Specific)

### Padding Values
- **Section Padding:** `18px` (all sides)
- **Card Padding:** `18px` (all sides)
- **Table Cell Padding:** `12px` vertical (inferred)

### Margin Values
- **Section Top Margin:** Variable (based on position)
- **Section Bottom Margin:** `0px` (sections are adjacent)
- **Content Top Margin:** `114px` (from top of content area)

### Gap Values
- **Between Metric Cards:** `16px`
- **Between Table Rows:** `0px` (adjacent)
- **Between Filter Tabs:** Variable (distributed)
- **Between Progress Metrics:** `33.33px` (distributed evenly)

---

## Layout Patterns

### Flexbox Usage
- **Section Headers:** Flexbox row, space-between
- **Metric Cards Container:** Flexbox row, gap 16px
- **Filter Tabs:** Flexbox row
- **Task Items:** Flexbox row, space-between
- **Progress Metrics:** Flexbox row, distributed evenly

### Grid Usage
- **Projects Workload:** Grid layout (variable columns)
- **Table Structure:** Implicit grid (column-based)

### Positioning
- **Absolute:** Used for precise positioning of nested elements
- **Relative:** Used for container positioning
- **Fixed:** Used for sidebar (stays fixed during scroll)

---

## Responsive Considerations

### Breakpoints (Inferred)
- **Desktop:** `1440px` width (full design)
- **Tablet:** `768px - 1023px` (sidebar collapses)
- **Mobile:** `< 768px` (stacked layout)

### Adaptive Behavior
- **Sidebar:** Collapses to `80px` on smaller screens
- **Content Area:** Expands to fill available space
- **Sections:** Stack vertically on mobile
- **Cards:** Full width on mobile, side-by-side on desktop

---

## Measurement Reference

### Absolute Positions (from top-left of content area)
- **Header Bar:** `23px` from top
- **Overview Section:** `114px` from top
- **Project Summary:** `394px` from top
- **Overall Progress:** `394px` from top
- **Today Task:** `773px` from top
- **Projects Workload:** `773px` from top

### Absolute Positions (from left edge)
- **Sidebar:** `0px` (left edge)
- **Content Area:** `260px` (after sidebar)
- **Project Summary:** `290px` (sidebar + 30px margin)
- **Overall Progress:** `1010px` (sidebar + gap + left position)
- **Projects Workload:** `1010px` (same as progress)

---

## Summary

This document contains all layout and structural specifications for the dashboard page extracted from the Figma design, excluding color information. All dimensions, spacing, typography, and component layouts are documented for implementation reference.

**Key Layout Characteristics:**
- ✅ Fixed sidebar width: `260px` (expanded)
- ✅ Content area width: `1180px`
- ✅ Section padding: `18px` (consistent)
- ✅ Card dimensions: `268px × 196px` (metrics)
- ✅ Table row height: `32px`
- ✅ Badge height: `24px` (pill-shaped)
- ✅ Progress circle: `298px` diameter
- ✅ Consistent `18px` section titles
- ✅ `16px` body text standard

---

**Last Updated:** January 30, 2025  
**Source:** Figma Design - Project Management Dashboard (FREE Community)  
**Node ID:** 0:1 (Dashboard Canvas)

