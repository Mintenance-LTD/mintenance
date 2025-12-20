# Component Consolidation Guide

**Date:** October 31, 2025  
**Status:** ✅ Complete  
**Impact:** High - Affects multiple components across the codebase

---

## 📋 Overview

This document describes the consolidation of redundant UI components into unified, flexible alternatives. This improves:
- **Developer Experience:** Fewer components to remember, clearer naming
- **Maintainability:** Single source of truth for each component type
- **Consistency:** Unified API across similar components
- **Bundle Size:** Reduced duplication

---

## 🎯 Components Consolidated

### 1. Badge Components → `Badge.unified.tsx`

**Old Components (Deprecated):**
- `Badge.tsx` - Basic badge
- `StatusBadge.tsx` - Status-specific badges
- `StatusChip.tsx` - Chip-style status indicators

**New Unified Component:**
- `Badge.unified.tsx` - All-in-one badge component

#### Migration Examples

```tsx
// OLD: Badge.tsx
import { Badge } from '@/components/ui/Badge';
<Badge variant="success">Active</Badge>

// NEW: Badge.unified.tsx
import { Badge } from '@/components/ui/Badge.unified';
<Badge variant="success">Active</Badge>  // Same API!
```

```tsx
// OLD: StatusBadge.tsx
import { StatusBadge } from '@/components/ui/StatusBadge';
<StatusBadge status="completed" />

// NEW: Badge.unified.tsx
import { Badge, StatusBadge } from '@/components/ui/Badge.unified';
<Badge status="completed">Completed</Badge>
// OR use the helper:
<StatusBadge status="completed" />
```

```tsx
// OLD: StatusChip.tsx
import { StatusChip } from '@/components/ui/StatusChip';
<StatusChip label="Active" tone="success" withDot />

// NEW: Badge.unified.tsx
import { Badge } from '@/components/ui/Badge.unified';
<Badge variant="success" withDot>Active</Badge>
```

---

### 2. Card Components → `Card.unified.tsx`

**Old Components (Still Available):**
- `Card.tsx` - Base card with sub-components
- `DashboardCard.tsx` - Dashboard cards, metric cards, progress cards
- `StandardCard.tsx` - Simple card with header/content
- `StatCard.tsx` - Stat display cards

**New Unified Component:**
- `Card.unified.tsx` - All card variants in one

#### Migration Examples

```tsx
// OLD: Card.tsx (still works)
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// NEW: Card.unified.tsx (improved API)
import { Card } from '@/components/ui/Card.unified';
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Content>Content</Card.Content>
</Card>
```

```tsx
// OLD: DashboardCard MetricCard
import { MetricCard } from '@/components/ui/DashboardCard';
<MetricCard 
  label="Revenue"
  value="£15,000"
  change={{ value: 12, label: 'from last month' }}
  trend="up"
/>

// NEW: Card.unified.tsx
import { Card } from '@/components/ui/Card.unified';
<Card.Metric
  label="Revenue"
  value="£15,000"
  trend={{ direction: 'up', value: '+12%', label: 'from last month' }}
/>
```

```tsx
// OLD: StatCard
import { StatCard } from '@/components/ui/StatCard';
<StatCard
  label="Total Projects"
  value="245"
  icon="briefcase"
  variant="primary"
/>

// NEW: Card.unified.tsx
import { Card } from '@/components/ui/Card.unified';
<Card.Metric
  label="Total Projects"
  value="245"
  icon="briefcase"
  color={theme.colors.primary}
/>
```

```tsx
// OLD: DashboardCard ProgressCard
import { ProgressCard } from '@/components/ui/DashboardCard';
<ProgressCard
  label="Completion"
  current={75}
  total={100}
  icon="checkCircle"
/>

// NEW: Card.unified.tsx
import { Card } from '@/components/ui/Card.unified';
<Card.Progress
  label="Completion"
  current={75}
  total={100}
  icon="checkCircle"
/>
```

---

### 3. Sidebar Components → `UnifiedSidebar`

**Old Components (Deprecated):**
- `AnimatedSidebar.tsx` - Animated collapsible sidebar (contractor)
- `StaticSidebar.tsx` - Static sidebar (homeowner)
- `Sidebar.tsx` (in /navigation/) - Original sidebar

**New Unified Component:**
- `UnifiedSidebar.tsx` - Role-based, persistent sidebar

#### Migration Examples

```tsx
// OLD: AnimatedSidebar (contractor)
import { AnimatedSidebar } from '@/components/ui/AnimatedSidebar';
<AnimatedSidebar
  sections={navSections}
  userInfo={userInfo}
  onLogout={handleLogout}
/>

// NEW: UnifiedSidebar
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
<UnifiedSidebar
  userRole="contractor"
  userInfo={userInfo}
  onLogout={handleLogout}
/>
```

```tsx
// OLD: StaticSidebar (homeowner)
import { StaticSidebar } from '@/components/ui/StaticSidebar';
<StaticSidebar
  sections={navSections}
  userInfo={userInfo}
  onLogout={handleLogout}
/>

// NEW: UnifiedSidebar
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
<UnifiedSidebar
  userRole="homeowner"
  userInfo={userInfo}
  onLogout={handleLogout}
/>
```

---

## 📦 New Component APIs

### Badge.unified API

```tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  status?: BadgeStatus; // Auto-maps to variant
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: string;
  withDot?: boolean;
  uppercase?: boolean;
}

// Helper components
<StatusBadge status="completed" />
<CountBadge count={5} variant="primary" />
```

**Supported Statuses:**
- `completed`, `approved`, `accepted` → green
- `in_progress`, `on_going`, `assigned` → orange
- `pending`, `draft` → gray
- `posted`, `open`, `sent` → blue
- `delayed`, `at_risk`, `declined`, `cancelled` → red
- `in_review` → yellow

---

### Card.unified API

```tsx
// Base Card
<Card variant="default" | "elevated" | "outlined" | "highlighted" | "bordered" padding="none" | "sm" | "md" | "lg">
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Subtitle</Card.Description>
  </Card.Header>
  <Card.Content>...</Card.Content>
  <Card.Footer>...</Card.Footer>
</Card>

// Metric Card
<Card.Metric
  label="Revenue"
  value="£15,000"
  icon="currencyDollar"
  trend={{ direction: 'up', value: '+12%', label: 'from last month' }}
  color="#10B981"
/>

// Progress Card
<Card.Progress
  label="Project Completion"
  current={75}
  total={100}
  icon="briefcase"
  color="#3B82F6"
/>

// Dashboard Card
<Card.Dashboard
  title="Analytics"
  subtitle="Last 30 days"
  icon="chart"
  actions={<Button>View</Button>}
  variant="default" | "highlighted"
>
  Content...
</Card.Dashboard>
```

---

## 🚀 Benefits of Consolidation

### For Developers:
1. **Less to Learn:** One Badge component instead of 3
2. **Clearer API:** Dot notation for specialized variants (`Card.Metric`, `Card.Progress`)
3. **Better TypeScript:** Single source of truth for types
4. **Easier Maintenance:** Fix bugs in one place

### For Users:
1. **Consistency:** All badges/cards look and behave the same
2. **Smaller Bundle:** Less code duplication
3. **Faster Performance:** Optimized unified components

### For the Codebase:
1. **Cleaner Imports:** `import { Card } from '@/components/ui/Card.unified'`
2. **Single Source of Truth:** No conflicting implementations
3. **Easier Testing:** Test one component instead of many
4. **Better Documentation:** Consolidated docs in one place

---

## 📝 Migration Checklist

### Phase 1: Adopt New Components (Current)
- [x] Create `Badge.unified.tsx`
- [x] Create `Card.unified.tsx`
- [x] Create deprecation files for old sidebars
- [x] Update documentation

### Phase 2: Gradual Migration (Next Sprint)
- [ ] Update new features to use unified components
- [ ] Add lint rules to warn about old component usage
- [ ] Create codemods for automatic migration (optional)

### Phase 3: Full Migration (Future)
- [ ] Migrate existing code to use unified components
- [ ] Remove old components (or keep as legacy with warnings)
- [ ] Update all import statements
- [ ] Run full test suite

---

## 🔍 Finding Component Usage

```bash
# Find Badge usage
grep -r "from '@/components/ui/Badge'" apps/web

# Find StatusBadge usage
grep -r "from '@/components/ui/StatusBadge'" apps/web

# Find StatusChip usage
grep -r "from '@/components/ui/StatusChip'" apps/web

# Find Card usage
grep -r "from '@/components/ui/Card'" apps/web
grep -r "from '@/components/ui/DashboardCard'" apps/web
grep -r "from '@/components/ui/StandardCard'" apps/web
grep -r "from '@/components/ui/StatCard'" apps/web

# Find AnimatedSidebar usage
grep -r "from '@/components/ui/AnimatedSidebar'" apps/web

# Find StaticSidebar usage
grep -r "from '@/components/ui/StaticSidebar'" apps/web
```

---

## 📚 Examples

### Complete Badge Examples

```tsx
import { Badge, StatusBadge, CountBadge } from '@/components/ui/Badge.unified';

// Basic badge
<Badge>New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="error" size="sm">Error</Badge>

// With icon
<Badge variant="warning" icon="alert">Warning</Badge>

// With dot
<Badge variant="info" withDot>In Progress</Badge>

// Status badge (auto-styled)
<Badge status="completed">Completed</Badge>
<StatusBadge status="in_progress" />

// Count badge
<CountBadge count={5} variant="error" />
<CountBadge count={150} /> // Shows "99+"
```

### Complete Card Examples

```tsx
import { Card } from '@/components/ui/Card.unified';
import { formatMoney } from '@/lib/utils/currency';

// Simple card
<Card>
  <Card.Header>
    <Card.Title>User Profile</Card.Title>
    <Card.Description>Manage your account</Card.Description>
  </Card.Header>
  <Card.Content>
    Profile content here
  </Card.Content>
  <Card.Footer>
    <Button>Save</Button>
  </Card.Footer>
</Card>

// Metric card
<Card.Metric
  label="Total Revenue"
  value={formatMoney(15000)}
  icon="currencyDollar"
  trend={{
    direction: 'up',
    value: '+12.5%',
    label: 'from last month'
  }}
  color={theme.colors.success}
/>

// Progress card
<Card.Progress
  label="Q4 Goals"
  current={8}
  total={12}
  icon="target"
  color={theme.colors.primary}
/>

// Dashboard card
<Card.Dashboard
  title="Recent Activity"
  subtitle="Last 7 days"
  icon="activity"
  actions={
    <Button variant="ghost" size="sm">
      View All
    </Button>
  }
>
  <ActivityList items={activities} />
</Card.Dashboard>

// Interactive card
<Card onClick={() => navigate('/details')} hover>
  <Card.Content>
    Click me!
  </Card.Content>
</Card>
```

---

## ⚠️ Breaking Changes

### None (Yet)

The old components are still available. The unified components are **additions**, not replacements (yet).

**Deprecation Timeline:**
1. **Now:** New unified components available
2. **Next Sprint:** Warnings added to old components
3. **Q1 2026:** Begin migration of existing code
4. **Q2 2026:** Remove old components (or keep with @deprecated tags)

---

## 🤝 Contributing

When creating new features:
1. ✅ **Use unified components** (`Badge.unified.tsx`, `Card.unified.tsx`)
2. ✅ **Use UnifiedSidebar** for navigation
3. ❌ **Don't use** old Badge/Card variants
4. ❌ **Don't use** AnimatedSidebar or StaticSidebar

---

## 📞 Questions?

If you have questions about:
- **Which component to use:** Always use `.unified` versions
- **Migration help:** Check this guide's examples
- **API questions:** See TypeScript types in the component files
- **Issues:** Report in #eng-frontend channel

---

## ✅ Summary

**What Changed:**
- Created `Badge.unified.tsx` - merges Badge, StatusBadge, StatusChip
- Created `Card.unified.tsx` - merges Card, DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard
- Deprecated AnimatedSidebar and StaticSidebar in favor of UnifiedSidebar

**What to Do:**
- Use unified components for all new code
- Gradually migrate existing code (no rush)
- Report issues if the new APIs don't cover your use case

**Files Created:**
- `apps/web/components/ui/Badge.unified.tsx`
- `apps/web/components/ui/Card.unified.tsx`
- `apps/web/components/ui/AnimatedSidebar.deprecated.tsx`
- `apps/web/components/ui/StaticSidebar.deprecated.tsx`
- `COMPONENT_CONSOLIDATION_GUIDE.md` (this file)

**Impact:** ⭐⭐⭐⭐⭐ High - Improves DX significantly

