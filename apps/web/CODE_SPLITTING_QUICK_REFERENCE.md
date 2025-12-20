# Code Splitting - Quick Reference Guide

## For Developers: When to Use Dynamic Imports

### Google Maps Components

**Always use `DynamicGoogleMap` for new map implementations:**

```typescript
// ✅ CORRECT - Use Dynamic Import
import { DynamicGoogleMap } from '@/components/maps';

function MyComponent() {
  return <DynamicGoogleMap center={coords} zoom={12} onMapLoad={handleLoad} />;
}
```

```typescript
// ❌ INCORRECT - Don't use direct import (unless SSR needed)
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';

function MyComponent() {
  return <GoogleMapContainer center={coords} zoom={12} />;
}
```

**Bundle Impact**: Saves ~150KB on initial load

---

### Chart Components (Recharts)

**Always use Dynamic Chart imports for new visualizations:**

```typescript
// ✅ CORRECT - Use Dynamic Imports
import {
  DynamicAreaChart,
  DynamicBarChart,
  DynamicLineChart,
  DynamicPieChart,
  Area, Bar, Line, Pie, // Child components are fine
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from '@/components/charts/DynamicCharts';

function MyDashboard() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <DynamicAreaChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="value" />
      </DynamicAreaChart>
    </ResponsiveContainer>
  );
}
```

```typescript
// ❌ INCORRECT - Don't import from recharts directly
import { AreaChart, Area, XAxis } from 'recharts';

function MyDashboard() {
  return (
    <AreaChart data={data}>
      <Area dataKey="value" />
    </AreaChart>
  );
}
```

**Bundle Impact**: Saves ~100KB on initial load

---

## Migration Checklist

When migrating existing components:

### Maps:
- [ ] Find: `import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer'`
- [ ] Replace with: `import { DynamicGoogleMap } from '@/components/maps'`
- [ ] Find: `<GoogleMapContainer`
- [ ] Replace with: `<DynamicGoogleMap`
- [ ] Test that map loads with skeleton animation

### Charts:
- [ ] Find: `import { AreaChart, BarChart, LineChart, PieChart } from 'recharts'`
- [ ] Replace with: `import { DynamicAreaChart, DynamicBarChart, ... } from '@/components/charts/DynamicCharts'`
- [ ] Find: `<AreaChart`, `<BarChart`, etc.
- [ ] Replace with: `<DynamicAreaChart`, `<DynamicBarChart`, etc.
- [ ] Keep child components (Area, Bar, Line, Pie) unchanged
- [ ] Test that charts load with skeleton animation

---

## Loading States

Both dynamic components automatically show loading skeletons:

### Map Skeleton
- Gray animated placeholder
- Matches map container dimensions
- Shows "Loading map..." text

### Chart Skeleton
- Animated bars/lines placeholder
- Configurable height prop
- Smooth fade-in when loaded

**No code changes needed** - skeletons are built into the dynamic wrappers!

---

## When NOT to Use Dynamic Imports

### Use Direct Imports When:

1. **Component is above-the-fold and always visible**
   - User sees it immediately on page load
   - No point in delaying load

2. **SSR is required**
   - Server-side rendering needed for SEO
   - Static generation with map/chart data

3. **Component is very small (<10KB)**
   - Code splitting overhead not worth it
   - Simple icon charts or tiny maps

### Example - Small Sparkline (keep direct import):
```typescript
// OK to use direct import for tiny sparklines
import { AreaChart, Area } from 'recharts';

function TinySparkline() {
  return (
    <AreaChart width={100} height={30} data={data}>
      <Area type="monotone" dataKey="value" />
    </AreaChart>
  );
}
```

---

## Performance Best Practices

### 1. Combine with Intersection Observer

Load charts only when user scrolls to them:

```typescript
import { useInView } from 'react-intersection-observer';
import { DynamicAreaChart } from '@/components/charts/DynamicCharts';

function LazyChart() {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <div ref={ref}>
      {inView && <DynamicAreaChart data={data}>...</DynamicAreaChart>}
    </div>
  );
}
```

### 2. Prefetch for Likely Navigation

```typescript
import { useEffect } from 'react';

function Navigation() {
  useEffect(() => {
    // Prefetch map chunk when user hovers over "Map" link
    const link = document.querySelector('[href="/map"]');
    link?.addEventListener('mouseenter', () => {
      import('@/components/maps'); // Prefetch
    });
  }, []);
}
```

### 3. Batch Chart Renders

Load all charts in a dashboard at once (avoid staggered loading):

```typescript
// ✅ GOOD - Charts in same chunk
import { DynamicAreaChart, DynamicBarChart } from '@/components/charts/DynamicCharts';

// All charts load together when first one renders
function Dashboard() {
  return (
    <>
      <DynamicAreaChart {...} />
      <DynamicBarChart {...} />
    </>
  );
}
```

---

## Troubleshooting

### Issue: "Cannot read property 'GoogleMapContainer' of undefined"

**Cause**: Trying to use GoogleMapContainer before script loads

**Fix**: Use DynamicGoogleMap (handles async loading)

### Issue: Chart shows as blank/white box

**Cause**: Chart component not loaded yet

**Fix**: Ensure you're using Dynamic version (has skeleton)

### Issue: Tests failing with dynamic imports

**Fix**: Mock dynamic imports in test setup:

```typescript
jest.mock('@/components/maps', () => ({
  DynamicGoogleMap: ({ children }: any) => <div>{children}</div>
}));
```

---

## Bundle Size Targets

Keep these targets in mind when building new features:

| Page Type | Target Initial JS | Target Total JS |
|-----------|-------------------|-----------------|
| Landing   | < 150KB           | < 300KB         |
| Dashboard | < 200KB           | < 500KB         |
| Admin     | < 250KB           | < 600KB         |

**How to Check:**
```bash
npm run build
npx webpack-bundle-analyzer .next/analyze/client.json
```

---

## Quick Commands

```bash
# Check current bundle size
npm run build && du -sh .next

# Analyze bundle composition
npm run build -- --stats
npx webpack-bundle-analyzer stats.json

# Test performance locally (throttled)
npm run dev
# Open DevTools > Network > Throttle to "Slow 3G"

# Run Lighthouse
npx lighthouse http://localhost:3000/contractor/discover --view
```

---

## Migration Status Tracker

Keep this updated as you migrate components:

**Maps (3/3 complete):**
- [x] ContractorDiscoverClient
- [x] JobsNearYouClient
- [x] ServiceAreasMap

**High-Priority Charts (5/15 complete):**
- [x] ReportingDashboard2025Client
- [x] AnalyticsClient
- [x] RevenueDashboardClient
- [x] PrimaryMetricCard2025
- [x] ProgressTrendChart

**Low-Priority Charts (0/10 - Future Phase):**
- [ ] SecurityDashboard
- [ ] KpiCard
- [ ] EnhancedChart
- [ ] ChartExamples
- [ ] AdminCharts
- [ ] ContractorMetricCard2025
- [ ] MarketInsightsClient
- [ ] Finance page charts

---

## Need Help?

**Questions about when to use dynamic imports?**
- Check bundle size impact first
- If component is >50KB and not above-fold, use dynamic

**Performance issues after migration?**
- Run Lighthouse comparison
- Check Network tab for chunk loading
- Verify skeletons show properly

**Breaking changes needed?**
- Avoid them! Dynamic wrappers maintain API compatibility
- If you must change props, update wrapper exports

---

**Last Updated**: 2025-12-08
**Maintained By**: Performance Optimizer Team
