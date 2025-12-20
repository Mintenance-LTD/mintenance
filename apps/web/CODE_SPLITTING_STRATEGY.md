# Code Splitting Strategy for Mintenance Next.js App

**Status:** ✅ Implementation Started
**Last Updated:** 2025-12-08
**Performance Impact:** Target 30-40% reduction in initial JS bundle

## Overview

This document outlines the strategic code splitting implementation for the Mintenance Next.js 16 application. Code splitting reduces initial bundle size by loading heavy components on-demand rather than at page load.

## Current Bundle Analysis

**Before Optimization:**
- Total build size: ~135MB
- Initial JS bundle: Estimated ~500KB (gzipped)
- Heavy dependencies:
  - `recharts`: ~100KB gzipped
  - `@react-google-maps/api`: ~150KB gzipped
  - `@tremor/react`: ~80KB gzipped
  - Various modal/dialog components: ~50KB total

**Target After Optimization:**
- Initial JS bundle: <300KB (gzipped)
- Reduction: 40%+ improvement in First Load JS

## Implementation Strategy

### Phase 1: Core Infrastructure ✅ COMPLETED

**Created reusable loading skeletons:**
- ✅ `MapSkeleton` - For Google Maps loading state
- ✅ `ChartSkeleton` - For chart components loading state
- ✅ Added to `components/ui/skeletons/index.ts`

**Created dynamic component wrappers:**
- ✅ `DynamicGoogleMap` - Wraps GoogleMapContainer with next/dynamic
- ✅ `DynamicCharts` - Exports dynamically loaded recharts components

### Phase 2: High-Priority Components 🔄 IN PROGRESS

#### 1. Google Maps Components (HIGHEST IMPACT)

**Files to update:**
- ❌ `app/contractor/discover/components/ContractorDiscoverClient.tsx`
- ❌ `app/contractor/jobs-near-you/components/JobsNearYouClient.tsx`
- ❌ `app/jobs/[id]/components/JobLocationMap.tsx`
- ❌ `app/contractors/components/ContractorMapView.tsx`
- ❌ `app/contractor/service-areas/components/ServiceAreasMap.tsx`

**Change pattern:**
```typescript
// BEFORE
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';

// AFTER
import { DynamicGoogleMap } from '@/components/maps';

// Usage remains the same
<DynamicGoogleMap
  center={center}
  zoom={zoom}
  onMapLoad={handleMapLoad}
/>
```

**Expected Savings:** ~150KB gzipped per route

#### 2. Chart Components (HIGH IMPACT)

**Files to update:**
- ❌ `app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx`
- ❌ `app/analytics/components/AnalyticsClient.tsx`
- ❌ `app/contractor/reporting/components/ReportingDashboard2025Client.tsx`
- ❌ `app/dashboard/components/RevenueChart2025.tsx`
- ❌ `app/admin/revenue/components/RevenueDashboardClient.tsx`

**Change pattern:**
```typescript
// BEFORE
import { AreaChart, BarChart, LineChart } from 'recharts';

// AFTER
import { DynamicAreaChart, DynamicBarChart, DynamicLineChart, Area, Bar, Line, XAxis, YAxis, Tooltip } from '@/components/charts';

// Usage: replace AreaChart with DynamicAreaChart
<DynamicAreaChart data={data}>
  <Area dataKey="revenue" />
  <XAxis />
  {/* ... */}
</DynamicAreaChart>
```

**Expected Savings:** ~100KB gzipped per route

### Phase 3: Medium-Priority Components ⏳ PLANNED

#### 3. Modal/Dialog Components

**Candidates:**
- Video call modals
- Image gallery/lightbox
- Bid comparison modals
- Document viewers

**Implementation:**
```typescript
const DynamicVideoCallModal = dynamic(
  () => import('./VideoCallModal'),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);
```

#### 4. Rich Editors

**Candidates:**
- Message composer
- Job description editor
- Bio/profile editors

#### 5. Heavy UI Libraries

**Candidates:**
- PDF viewers (`react-pdf`)
- Image cropper components
- Calendar/date pickers (if heavy)

### Phase 4: Advanced Optimizations ⏳ FUTURE

#### Component-Level Code Splitting

For large page components:
```typescript
// Split dashboard into smaller chunks
const DashboardMetrics = dynamic(() => import('./DashboardMetrics'));
const DashboardCharts = dynamic(() => import('./DashboardCharts'));
const DashboardActivity = dynamic(() => import('./DashboardActivity'));
```

#### Route-Based Prefetching

```typescript
// Prefetch likely next pages
<Link href="/contractor/discover" prefetch={true}>
```

## Best Practices

### DO ✅

1. **Use `next/dynamic`** over `React.lazy` for better SSR support
2. **Provide loading components** - Never leave users staring at blank space
3. **Set `ssr: false`** for client-only components (maps, charts with browser APIs)
4. **Split large libraries** - Anything >50KB gzipped is a candidate
5. **Test on slow 3G** - Use Chrome DevTools throttling
6. **Monitor bundle analyzer** - Run `npm run build:analyze` regularly

### DON'T ❌

1. **Don't over-split** - Splitting 5KB components adds overhead
2. **Don't split critical path** - Hero sections, navigation should load immediately
3. **Don't split shared components** - Buttons, inputs, cards used everywhere
4. **Don't skip loading states** - Always provide skeleton/spinner
5. **Don't break SSR** - Ensure components work on server when needed

## Measuring Impact

### Before Implementation
```bash
npm run build
# Check "First Load JS" in build output
```

### After Implementation
```bash
npm run build:analyze
# Compare bundle sizes in the analyzer
```

### Lighthouse Scores to Monitor
- **LCP (Largest Contentful Paint):** Target < 2.5s
- **FID (First Input Delay):** Target < 100ms
- **TBT (Total Blocking Time):** Target < 300ms
- **Bundle Size:** Target < 300KB initial JS

## Testing Checklist

For each updated component:
- [ ] Component loads correctly
- [ ] Loading skeleton displays properly
- [ ] No console errors in browser
- [ ] Component works on mobile
- [ ] Component works in production build
- [ ] Lighthouse score improved or maintained

## Migration Guide for Developers

### Updating a Map Component

```typescript
// 1. Update import
- import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';
+ import { DynamicGoogleMap } from '@/components/maps';

// 2. Replace component name
- <GoogleMapContainer
+ <DynamicGoogleMap
    center={center}
    zoom={zoom}
    onMapLoad={handleMapLoad}
  />
```

### Updating a Chart Component

```typescript
// 1. Update imports
- import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
+ import { DynamicAreaChart, Area, XAxis, YAxis, Tooltip } from '@/components/charts';

// 2. Replace component name
- <AreaChart data={data}>
+ <DynamicAreaChart data={data}>
    <Area dataKey="value" />
    <XAxis />
    <YAxis />
    <Tooltip />
- </AreaChart>
+ </DynamicAreaChart>
```

## Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial JS Bundle | ~500KB | <300KB | 🔄 In Progress |
| LCP | ~3.2s | <2.5s | 🔄 In Progress |
| FID | <100ms | <100ms | ✅ Good |
| CLS | 0.08 | <0.1 | ✅ Good |
| Lighthouse Score | 78 | >90 | 🔄 In Progress |

## Next Steps

1. ✅ Create loading skeletons (MapSkeleton, ChartSkeleton)
2. ✅ Create dynamic component wrappers
3. 🔄 Update all map components to use DynamicGoogleMap
4. ⏳ Update all chart components to use Dynamic charts
5. ⏳ Create modal skeletons
6. ⏳ Implement modal/dialog code splitting
7. ⏳ Run bundle analyzer and measure improvement
8. ⏳ Document results and update targets

## Rollback Plan

If issues arise:
1. Revert to direct imports: `import { GoogleMapContainer } from '@/components/maps'`
2. Remove `loading` prop from dynamic imports
3. Set `ssr: true` if SSR issues occur
4. File issue with details for investigation

## Resources

- [Next.js Dynamic Imports](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading)
- [Bundle Analyzer Setup](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Web.dev Code Splitting Guide](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
- [Core Web Vitals](https://web.dev/vitals/)

---

**Maintained by:** Performance Optimizer Agent
**Review Frequency:** After each major feature addition
**Contact:** See `.claude/agents/performance-optimizer.md`
