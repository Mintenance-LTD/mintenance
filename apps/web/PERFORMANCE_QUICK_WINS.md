# Performance Quick Wins - Code Splitting Implementation

**Quick Reference Guide for Developers**

## Quick Implementation Checklist

### For Map Components

```typescript
// ❌ BEFORE (Heavy, loads immediately)
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';

<GoogleMapContainer center={coords} zoom={10} />

// ✅ AFTER (Lightweight, loads on-demand)
import { DynamicGoogleMap } from '@/components/maps';

<DynamicGoogleMap center={coords} zoom={10} />
```

**Files Updated:**
- ✅ `app/jobs/[id]/components/JobLocationMap.tsx`
- ✅ `app/contractors/components/ContractorMapView.tsx`

**Still Need Updates:**
- ❌ `app/contractor/discover/components/ContractorDiscoverClient.tsx`
- ❌ `app/contractor/jobs-near-you/components/JobsNearYouClient.tsx`
- ❌ `app/contractor/service-areas/components/ServiceAreasMap.tsx`

### For Chart Components

```typescript
// ❌ BEFORE
import { AreaChart, BarChart, LineChart, Area, Bar, Line } from 'recharts';

<AreaChart data={data}>
  <Area dataKey="revenue" />
</AreaChart>

// ✅ AFTER
import { DynamicAreaChart, Area } from '@/components/charts';

<DynamicAreaChart data={data}>
  <Area dataKey="revenue" />
</DynamicAreaChart>
```

**Files That Need Updates:**
- ❌ `app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx`
- ❌ `app/analytics/components/AnalyticsClient.tsx`
- ❌ `app/contractor/reporting/components/ReportingDashboard2025Client.tsx`
- ❌ `app/dashboard/components/RevenueChart2025.tsx`

## Component Catalog

### Available Dynamic Components

| Component | Import Path | Use Case | Savings |
|-----------|-------------|----------|---------|
| `DynamicGoogleMap` | `@/components/maps` | All map displays | ~150KB |
| `DynamicAreaChart` | `@/components/charts` | Area/trend charts | ~100KB |
| `DynamicBarChart` | `@/components/charts` | Bar charts | ~100KB |
| `DynamicLineChart` | `@/components/charts` | Line charts | ~100KB |
| `DynamicPieChart` | `@/components/charts` | Pie/donut charts | ~100KB |

### Loading Skeletons

| Skeleton | Import Path | Use Case |
|----------|-------------|----------|
| `MapSkeleton` | `@/components/ui/skeletons` | Map loading state |
| `ChartSkeleton` | `@/components/ui/skeletons` | Chart loading state |
| `DashboardSkeleton` | `@/components/ui/skeletons` | Full dashboard |

## Manual Dynamic Import Pattern

For custom components not in the catalog:

```typescript
import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/components/ui/skeletons';

const DynamicMyComponent = dynamic(
  () => import('./MyHeavyComponent'),
  {
    loading: () => <MapSkeleton />,
    ssr: false, // Use for client-only components
  }
);

// Use in render
<DynamicMyComponent prop1={value1} />
```

## When to Use Code Splitting

### ✅ GOOD Candidates

- Maps (Google Maps, Mapbox)
- Charts/graphs (recharts, d3)
- Rich text editors
- PDF viewers
- Image galleries/lightboxes
- Video players
- Heavy modals/dialogs
- Components > 50KB

### ❌ BAD Candidates

- Navigation components
- Header/footer
- Small UI components (buttons, inputs)
- Critical above-the-fold content
- Components < 10KB

## Testing Your Changes

### 1. Development Test
```bash
npm run dev
# Navigate to the page with your updated component
# Check browser console for errors
# Verify loading skeleton appears briefly
```

### 2. Production Build Test
```bash
npm run build
# Look for bundle size in output
# Check "First Load JS" metric
```

### 3. Bundle Analysis
```bash
npm run build:analyze
# Opens webpack-bundle-analyzer
# Look for your component in the chunks
```

### 4. Lighthouse Audit
```bash
# In Chrome DevTools:
# 1. Open page in incognito
# 2. Open DevTools > Lighthouse
# 3. Run Performance audit
# 4. Check "First Load JS" metric
```

## Common Issues & Fixes

### Issue: "Cannot read property 'Map' of undefined"

**Cause:** Google Maps API not loaded yet
**Fix:** Ensure `ssr: false` in dynamic import

```typescript
const DynamicGoogleMap = dynamic(
  () => import('./GoogleMapContainer'),
  { ssr: false } // ← Add this
);
```

### Issue: "Module not found: Can't resolve '@/components/charts'"

**Cause:** Charts directory doesn't exist
**Fix:** Ensure you created `components/charts/index.ts`

### Issue: Component flashes/jumps on load

**Cause:** Missing loading skeleton
**Fix:** Add proper loading component

```typescript
const DynamicChart = dynamic(
  () => import('./Chart'),
  { loading: () => <ChartSkeleton /> } // ← Add this
);
```

## Performance Metrics to Monitor

| Metric | Target | Current | Tool |
|--------|--------|---------|------|
| First Load JS | < 300KB | ~500KB | `npm run build` |
| LCP | < 2.5s | ~3.2s | Lighthouse |
| TBT | < 300ms | ~250ms | Lighthouse |
| Lighthouse Score | > 90 | 78 | Chrome DevTools |

## Quick Wins Checklist

Copy this to track your progress:

```markdown
## Map Components (5 files)
- [x] app/jobs/[id]/components/JobLocationMap.tsx
- [x] app/contractors/components/ContractorMapView.tsx
- [ ] app/contractor/discover/components/ContractorDiscoverClient.tsx
- [ ] app/contractor/jobs-near-you/components/JobsNearYouClient.tsx
- [ ] app/contractor/service-areas/components/ServiceAreasMap.tsx

## Chart Components (5+ files)
- [ ] app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx
- [ ] app/analytics/components/AnalyticsClient.tsx
- [ ] app/contractor/reporting/components/ReportingDashboard2025Client.tsx
- [ ] app/dashboard/components/RevenueChart2025.tsx
- [ ] app/admin/revenue/components/RevenueDashboardClient.tsx

## Expected Impact
- Bundle size reduction: ~40%
- LCP improvement: ~0.7s
- Lighthouse score: +12 points
```

## Next Steps After Quick Wins

1. Implement modal/dialog code splitting
2. Add route-based prefetching for likely navigations
3. Optimize image loading with next/image
4. Consider component-level splitting for large pages
5. Set up performance monitoring with Web Vitals

## Need Help?

- See full strategy: `CODE_SPLITTING_STRATEGY.md`
- Performance agent: `.claude/agents/performance-optimizer.md`
- Next.js docs: https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading
