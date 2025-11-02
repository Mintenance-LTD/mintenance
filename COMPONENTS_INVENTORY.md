# Components Inventory

A comprehensive overview of all components in the web application.

---

## 📂 Directory Structure

```
apps/web/components/
├── admin/               # Admin-only components
├── analytics/           # Analytics & metrics components
├── layouts/             # Layout components (NEW: UnifiedSidebar)
├── maps/               # Google Maps integration
├── messaging/          # Chat & messaging UI
├── monitoring/         # Performance monitoring
├── navigation/         # Navigation components
├── payments/           # Payment & billing UI
├── project-timeline/   # Timeline & milestones
├── search/             # Search components
├── ui/                 # Core UI library (45+ components)
├── video-call/         # Video calling features
└── standalone files    # Single-purpose components

apps/web/app/components/
└── landing/            # Landing page sections
```

---

## 🎨 UI Components Library (`/components/ui/`)

### 📊 **Data Display**
- **ActivityTimeline.tsx** - Timeline for activities/events
- **DashboardCard.tsx** - Dashboard metric cards
- **DataTable.tsx** - Advanced data tables with sorting/filtering
- **MetricCard.tsx** - KPI metric display cards (used in dashboards)
- **ProjectTable.tsx** - Table for project listings
- **StatCard.tsx** - Simple stat display cards
- **StandardCard.tsx** - Generic card component
- **CircularProgress.tsx** - Circular progress indicators
- **ProgressBar.tsx** - Linear progress bars
- **SimpleChart.tsx** - Basic chart component
- **TodayTasks.tsx** - Today's task list component

### 🧭 **Navigation**
- **AnimatedSidebar.tsx** - Animated collapsible sidebar (original)
- **StaticSidebar.tsx** - Static sidebar (original)
- **MobileNavigation.tsx** - Bottom mobile navigation
- **Navigation.tsx** - General navigation component
- **Breadcrumbs.tsx** - Breadcrumb navigation
- **SkipLink.tsx** - Accessibility skip link

### 🔘 **Form Controls**
- **Button.tsx** - Standard button component
- **TouchButton.tsx** - Touch-optimized button
- **Input.tsx** - Text input field
- **Textarea.tsx** - Multi-line text input
- **DateRangePicker.tsx** - Date range selector
- **AdvancedFilters.tsx** - Advanced filtering UI
- **ExportMenu.tsx** - Export data menu

### 📱 **Mobile/Touch**
- **Touchable.tsx** - Touch-optimized wrapper
- **SwipeableCarousel.tsx** - Swipeable image carousel
- **PullToRefresh.tsx** - Pull-to-refresh gesture
- **FloatingActionButton.tsx** - FAB for mobile

### 🏷️ **Status & Badges**
- **Badge.tsx** - Status badges
- **StatusBadge.tsx** - Status indicator badges
- **StatusChip.tsx** - Chip-style status indicators
- **NotificationBanner.tsx** - Banner notifications
- **Toast.tsx** - Toast notifications

### 📄 **Layout**
- **Card.tsx** - Base card component
- **Layout.tsx** - Page layout wrapper
- **PageLayout.tsx** - Standard page layout
- **PageHeader.tsx** - Page header component
- **ResponsiveGrid.tsx** - Responsive grid layout

### ⚙️ **Utilities**
- **LoadingSpinner.tsx** - Loading spinners
- **SkeletonLoader.tsx** - Skeleton loading states
- **EmptyState.tsx** - Empty state placeholders
- **ErrorBoundary.tsx** - Error boundary wrapper
- **ErrorView.tsx** - Error display component
- **Icon.tsx** - Icon component system

### 📦 **Index Export**
- **index.ts** - Barrel export for easy imports

---

## 🏢 **Admin Components** (`/components/admin/`)
- **SecurityDashboard.tsx** - Security monitoring dashboard

---

## 📈 **Analytics Components** (`/components/analytics/`)
- **AnalyticsOverview.tsx** - Main analytics overview
- **PerformanceInsights.tsx** - Performance insights display
- **PerformanceTrends.tsx** - Performance trend charts
- **index.ts** - Barrel export

---

## 🏗️ **Layout Components** (`/components/layouts/`) ⭐ NEW
- **UnifiedSidebar.tsx** - NEW! Persistent sidebar with terracotta styling
- **Header.tsx** - App header component
- **ThreePanelLayout.tsx** - Three-panel layout system

---

## 🗺️ **Maps Components** (`/components/maps/`)
- **GoogleMapContainer.tsx** - Google Maps integration
- **index.ts** - Barrel export
- **__tests__/**
  - **GoogleMapContainer.test.tsx** - Map tests

---

## 💬 **Messaging Components** (`/components/messaging/`)
- **ConversationCard.tsx** - Conversation list item
- **MessageBubble.tsx** - Chat message bubble
- **MessageInput.tsx** - Message input field

---

## 📊 **Monitoring Components** (`/components/monitoring/`)
- **WebVitalsMonitor.tsx** - Web vitals monitoring

---

## 🧭 **Navigation Components** (`/components/navigation/`)
- **Sidebar.tsx** - Original sidebar component

---

## 💳 **Payment Components** (`/components/payments/`)
- **FeeCalculator.tsx** - Calculate fees/costs
- **PaymentCard.tsx** - Payment method card
- **PaymentForm.tsx** - Payment form UI

---

## 📅 **Project Timeline Components** (`/components/project-timeline/`)
- **TimelineView.tsx** - Timeline visualization
- **MilestoneEditor.tsx** - Edit project milestones
- **index.ts** - Barrel export

---

## 🔍 **Search Components** (`/components/search/`)
- **AdvancedSearchFilters.tsx** - Advanced search filters

---

## 📱 **Video Call Components** (`/components/video-call/`)
- **VideoCallInterface.tsx** - Main video call UI
- **VideoCallScheduler.tsx** - Schedule video calls
- **VideoCallHistory.tsx** - Call history
- **index.ts** - Barrel export

---

## 🎯 **Standalone Components** (`/components/`)
- **CookieConsent.tsx** - Cookie consent banner
- **DashboardLoading.tsx** - Dashboard loading state
- **LogoLink.tsx** - Logo with link
- **LogoutButton.tsx** - Logout button
- **MobileLandingPage.tsx** - Mobile landing page
- **PerformanceDashboard.tsx** - Performance dashboard
- **PWAInitializer.tsx** - PWA initialization
- **SearchBar.tsx** - Global search bar
- **SwipeableCard.tsx** - Swipeable card
- **UnauthenticatedCard.tsx** - Unauthenticated state card

---

## 🏠 **Landing Page Components** (`/app/components/landing/`)
- **LandingNavigation.tsx** - Landing page nav
- **HeroSection.tsx** - Hero section
- **FeaturesSection.tsx** - Features showcase
- **ServicesSection.tsx** - Services list
- **HowItWorksSection.tsx** - How it works
- **StatsSection.tsx** - Statistics display
- **CTASection.tsx** - Call-to-action section
- **CTAClient.tsx** - Client-side CTA
- **FooterSection.tsx** - Footer section

---

## 🎨 **Logo Component** (`/app/components/`)
- **Logo.tsx** - Application logo

---

## 📊 Component Usage Summary

### Total Components: **85+**

#### By Category:
- **UI Components:** 45+
- **Landing Page:** 9
- **Messaging:** 3
- **Video Call:** 3
- **Project Timeline:** 2
- **Analytics:** 3
- **Payments:** 3
- **Maps:** 1
- **Layouts:** 3 (including new UnifiedSidebar)
- **Navigation:** 1
- **Admin:** 1
- **Monitoring:** 1
- **Search:** 1
- **Standalone:** 12

---

## 🔥 Most Important Components

### For Dashboards:
1. ✅ **UnifiedSidebar** (NEW) - Persistent sidebar
2. **MetricCard** - KPI display
3. **DashboardCard** - Dashboard cards
4. **CircularProgress** - Progress indicators
5. **ProjectTable** - Project listings
6. **TodayTasks** - Task lists
7. **ActivityTimeline** - Activity feed
8. **StatCard** - Quick stats

### For Forms:
1. **Button** - Primary actions
2. **Input** - Text inputs
3. **Textarea** - Multi-line input
4. **DateRangePicker** - Date selection
5. **AdvancedFilters** - Filtering

### For Navigation:
1. ✅ **UnifiedSidebar** (NEW) - Main navigation
2. **Breadcrumbs** - Page path
3. **MobileNavigation** - Mobile nav
4. **PageHeader** - Page titles

### For Feedback:
1. **Toast** - Notifications
2. **NotificationBanner** - Alerts
3. **Badge** - Status indicators
4. **LoadingSpinner** - Loading states
5. **EmptyState** - No data states

---

## 🆕 Recent Additions

### October 31, 2025:
- ✅ **Badge.unified.tsx** - Unified badge component
  - Location: `/components/ui/`
  - Purpose: Replace Badge, StatusBadge, StatusChip
  - Features: All badge variants in one flexible component
  
- ✅ **Card.unified.tsx** - Unified card component
  - Location: `/components/ui/`
  - Purpose: Replace Card, DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard
  - Features: All card variants with dot notation API

- ✅ **UnifiedSidebar.tsx** - Persistent sidebar with terracotta styling
  - Location: `/components/layouts/`
  - Purpose: Replace AnimatedSidebar, StaticSidebar, Sidebar
  - Features: Role-based navigation, persistent across pages

---

## 🔄 Component Relationships

### Sidebar Evolution:
```
Old System:
├── AnimatedSidebar.tsx (contractor)
└── StaticSidebar.tsx (homeowner)

New System:
└── UnifiedSidebar.tsx (both roles) ⭐
    ├── Role-based navigation
    ├── Terracotta color scheme
    └── Persistent across all pages
```

### Dashboard Components:
```
Dashboard Page
├── UnifiedSidebar (navigation)
├── DashboardHeader (page header)
├── KpiCards (metrics)
│   ├── MetricCard
│   └── Icon
├── UpcomingList (upcoming items)
├── InvoicesChart (charts)
└── ActivityFeed (recent activity)
    └── ActivityTimeline
```

---

## 💡 Usage Recommendations

### ✅ Use These:
- **UnifiedSidebar** - For all navigation (NEW)
- **MetricCard** - For KPIs and metrics
- **Button** - For all button actions
- **Card** - For content grouping
- **Toast** - For notifications
- **Icon** - For all icons (consistent system)

### 🗑️ Deleted Components (No Longer Available):
- **AnimatedSidebar** 🗑️ DELETED → Use `UnifiedSidebar`
- **StaticSidebar** 🗑️ DELETED → Use `UnifiedSidebar`
- **Sidebar** (in /navigation/) 🗑️ DELETED → Use `UnifiedSidebar`
- **Badge.tsx** 🗑️ DELETED → Use `Badge.unified.tsx`
- **StatusBadge.tsx** 🗑️ DELETED → Use `Badge.unified.tsx`
- **StatusChip.tsx** 🗑️ DELETED → Use `Badge.unified.tsx`
- **DashboardCard.tsx** 🗑️ DELETED → Use `Card.unified.tsx`
- **StandardCard.tsx** 🗑️ DELETED → Use `Card.unified.tsx`
- **StatCard.tsx** 🗑️ DELETED → Use `Card.unified.tsx`

⚠️ **If you get import errors, see `DELETED_COMPONENTS.md` for migration help!**

### ✅ New Unified Components (Use These!):
- **Badge.unified.tsx** - All badge variants (replaces 3 deleted components)
- **Card.unified.tsx** - All card variants (replaces 6 deleted components)
- **UnifiedSidebar.tsx** - All sidebar needs (replaces 3 deleted components)

---

## 📝 Import Patterns

### ✅ New Unified Components:
```typescript
// Badge (NEW - replaces Badge, StatusBadge, StatusChip)
import { Badge, StatusBadge, CountBadge } from '@/components/ui/Badge.unified';

// Card (NEW - replaces all card variants)
import { Card } from '@/components/ui/Card.unified';

// Sidebar (NEW - replaces all sidebar variants)
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
```

### Legacy UI Components (Still Available):
```typescript
// Individual imports
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card'; // Legacy - use Card.unified for new code
import { Icon } from '@/components/ui/Icon';
```

### Utilities:
```typescript
// Currency utility
import { formatMoney } from '@/lib/utils/currency';
```

### ❌ Deleted Components (Will Cause Import Errors):
```typescript
// These no longer exist - will fail!
import { Badge } from '@/components/ui/Badge'; // ❌ DELETED
import { StatusBadge } from '@/components/ui/StatusBadge'; // ❌ DELETED
import { DashboardCard } from '@/components/ui/DashboardCard'; // ❌ DELETED
import { AnimatedSidebar } from '@/components/ui/AnimatedSidebar'; // ❌ DELETED

// Use these instead:
import { Badge } from '@/components/ui/Badge.unified'; // ✅
import { Card } from '@/components/ui/Card.unified'; // ✅
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar'; // ✅
```

---

## 🎯 Component Standards

### All components should:
- ✅ Be TypeScript with proper types
- ✅ Use theme tokens (colors, spacing, typography)
- ✅ Support responsive design
- ✅ Have proper accessibility (ARIA labels, keyboard nav)
- ✅ Include hover/focus states
- ✅ Use consistent naming (PascalCase for components)
- ✅ Have clear, single responsibility
- ✅ Be under 500 lines (split if larger)

---

## 📚 Quick Reference

### Need a component for:
- **Dashboard metrics?** → MetricCard, DashboardCard
- **Navigation?** → UnifiedSidebar
- **Forms?** → Button, Input, Textarea
- **Loading states?** → LoadingSpinner, SkeletonLoader
- **Empty states?** → EmptyState
- **Errors?** → ErrorView, ErrorBoundary
- **Tables?** → DataTable, ProjectTable
- **Progress?** → CircularProgress, ProgressBar
- **Notifications?** → Toast, NotificationBanner
- **Status indicators?** → Badge, StatusBadge
- **Icons?** → Icon
- **Cards?** → Card (general), DashboardCard (metrics)
- **Mobile UI?** → MobileNavigation, Touchable, PullToRefresh

---

## 🔍 Testing Coverage

Components with tests:
- ✅ GoogleMapContainer.test.tsx

**Recommendation:** Add tests for critical components:
- UnifiedSidebar
- MetricCard
- Button
- Input
- DataTable

---

**Total Components: ~75** (reduced from 85+ after consolidation)
**Most Used: UI Components (35+)** 
**Newest: Badge.unified, Card.unified, UnifiedSidebar (Oct 31, 2025)**
**Deleted: 9 redundant components**
**Status: ✅ Consolidated and optimized**

⚠️ **Breaking Change:** Old Badge, Card, and Sidebar variants have been **deleted**. See `DELETED_COMPONENTS.md` for migration help.

