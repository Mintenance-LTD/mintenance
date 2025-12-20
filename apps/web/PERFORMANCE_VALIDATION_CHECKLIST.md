# Performance Validation Checklist - Code Splitting Migration

## Date: 2025-12-08
## Migration: Google Maps & Recharts Dynamic Imports

---

## Pre-Deployment Validation

### 1. Build Verification

```bash
# Build the app
npm run build

# Check for build errors
# ✅ Build should complete successfully
# ✅ No TypeScript errors
# ✅ No import resolution errors
```

**Expected Output:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

---

### 2. Bundle Analysis

```bash
# Generate bundle stats
npm run build -- --stats

# Analyze bundle
npx webpack-bundle-analyzer .next/stats.json
```

**What to Verify:**

#### Map Components:
- [ ] `GoogleMapContainer.tsx` NOT in main bundle chunks
- [ ] Map-related pages show separate lazy chunks (~150KB)
- [ ] Initial bundle reduced on non-map pages

#### Chart Components:
- [ ] `recharts` NOT in main bundle chunks
- [ ] Chart-related pages show separate lazy chunks (~100KB)
- [ ] Initial bundle reduced on non-chart pages

**Expected Chunk Structure:**
```
Main Bundle:
  - pages/_app.js (150-200KB)
  - pages/index.js (80-120KB)

Lazy Chunks:
  - maps-chunk.js (~150KB) - Only loads on map pages
  - charts-chunk.js (~100KB) - Only loads on chart pages
```

---

### 3. Route-by-Route Testing

Test each migrated component manually:

#### Map Components:

##### A. Contractor Discover Page
**URL:** `/contractor/discover`

- [ ] Page loads without errors
- [ ] Map skeleton shows while loading
- [ ] Map renders with job markers
- [ ] Click on markers shows info windows
- [ ] Map is interactive (pan, zoom)
- [ ] No console errors
- [ ] Network tab shows map chunk loaded separately

##### B. Jobs Near You
**URL:** `/contractor/jobs-near-you`

- [ ] Page loads without errors
- [ ] Map skeleton shows while loading (if map view selected)
- [ ] Map renders with contractor location + job locations
- [ ] Switching between list/map views works
- [ ] Distance calculations display correctly
- [ ] No console errors

##### C. Service Areas
**URL:** `/contractor/service-areas`

- [ ] Page loads without errors
- [ ] Map skeleton shows while loading
- [ ] Service area circles render correctly
- [ ] Clicking circles/markers shows details
- [ ] Legend displays properly
- [ ] Coverage stats show correctly
- [ ] No console errors

#### Chart Components:

##### D. Reporting Dashboard
**URL:** `/contractor/reporting`

- [ ] Page loads without errors
- [ ] Chart skeletons show while loading
- [ ] Revenue chart (AreaChart) renders
- [ ] Monthly comparison chart (BarChart) renders
- [ ] Data displays correctly
- [ ] Tooltips work on hover
- [ ] Export buttons functional
- [ ] No console errors

##### E. Analytics Page
**URL:** `/analytics`

- [ ] Page loads without errors
- [ ] All metric cards render
- [ ] Charts load with skeletons
- [ ] Data visualization correct
- [ ] Period selectors work
- [ ] No console errors

##### F. Admin Revenue Dashboard
**URL:** `/admin/revenue`

- [ ] Page loads without errors (with admin credentials)
- [ ] Revenue metrics display
- [ ] Charts render correctly
- [ ] MRR calculations shown
- [ ] No console errors

##### G. Dashboard Metric Cards
**URL:** `/dashboard`

- [ ] Page loads without errors
- [ ] Primary metric cards display
- [ ] Sparklines render in cards
- [ ] Trend indicators show correctly
- [ ] No console errors

##### H. Progress Trends
**URL:** `/contractor/dashboard-enhanced`

- [ ] Page loads without errors
- [ ] Progress trend chart displays
- [ ] Completion rates visible
- [ ] Chart animates on load
- [ ] No console errors

---

### 4. Performance Metrics

#### Lighthouse Audits

Run Lighthouse on key pages and compare before/after:

```bash
# Before (from baseline)
npx lighthouse http://localhost:3000/contractor/discover --output html --output-path ./reports/before-discover.html

# After (current)
npx lighthouse http://localhost:3000/contractor/discover --output html --output-path ./reports/after-discover.html
```

**Pages to Test:**
1. `/contractor/discover` (map)
2. `/contractor/reporting` (charts)
3. `/dashboard` (both)
4. `/` (landing - should see improvement)

**Expected Improvements:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Performance Score | 75-80 | 80-85 | +5-10 points |
| FCP | 1.8s | 1.5s | -300ms |
| LCP | 3.5s | 2.8s | -700ms |
| TTI | 4.2s | 3.5s | -700ms |
| Total Blocking Time | 350ms | 200ms | -150ms |
| Bundle Size | 850KB | 600KB | -250KB |

---

### 5. Network Analysis

**Open Chrome DevTools → Network Tab**

#### Test: Map Page Load
1. Navigate to `/contractor/discover`
2. Check Network tab

**Verify:**
- [ ] Separate chunk file loaded for maps (e.g., `maps-chunk-*.js`)
- [ ] Chunk loads AFTER initial page render
- [ ] Chunk size ~150KB gzipped
- [ ] No duplicate Google Maps SDK loads

#### Test: Chart Page Load
1. Navigate to `/contractor/reporting`
2. Check Network tab

**Verify:**
- [ ] Separate chunk file loaded for charts (e.g., `charts-chunk-*.js`)
- [ ] Chunk loads AFTER initial page render
- [ ] Chunk size ~100KB gzipped
- [ ] No duplicate recharts loads

#### Test: Landing Page (No Maps/Charts)
1. Navigate to `/`
2. Check Network tab

**Verify:**
- [ ] NO maps chunk loaded
- [ ] NO charts chunk loaded
- [ ] Initial bundle smaller than before
- [ ] FCP faster

---

### 6. Slow Connection Testing

**Throttle Network:**
- Chrome DevTools → Network → Throttling → Slow 3G

**Test Each Page:**

1. **Map Pages (Slow 3G)**
   - [ ] Skeleton shows immediately
   - [ ] Map loads within 5-8 seconds
   - [ ] No timeout errors
   - [ ] Smooth transition from skeleton to map

2. **Chart Pages (Slow 3G)**
   - [ ] Skeleton shows immediately
   - [ ] Charts load within 3-5 seconds
   - [ ] No timeout errors
   - [ ] Smooth transition from skeleton to chart

3. **Landing Page (Slow 3G)**
   - [ ] Loads faster than before (no heavy libs)
   - [ ] Content visible within 2-3 seconds
   - [ ] Interactive within 4-5 seconds

---

### 7. Browser Compatibility

Test on multiple browsers:

#### Chrome (Primary)
- [ ] All pages work
- [ ] Maps render
- [ ] Charts render
- [ ] No console errors

#### Firefox
- [ ] All pages work
- [ ] Maps render
- [ ] Charts render
- [ ] No console errors

#### Safari
- [ ] All pages work
- [ ] Maps render
- [ ] Charts render
- [ ] No console errors

#### Edge
- [ ] All pages work
- [ ] Maps render
- [ ] Charts render
- [ ] No console errors

---

### 8. Mobile Testing

Test on mobile devices or emulation:

**Chrome DevTools → Device Toolbar → Mobile**

#### iPhone 12 Pro
- [ ] Maps work on mobile
- [ ] Charts responsive
- [ ] Touch interactions work
- [ ] No layout issues

#### Pixel 5
- [ ] Maps work on mobile
- [ ] Charts responsive
- [ ] Touch interactions work
- [ ] No layout issues

---

### 9. Error Handling

Test error scenarios:

#### A. Network Error During Chunk Load
1. Throttle to offline
2. Navigate to map page
3. Turn network back on

**Expected:**
- [ ] Error boundary catches failure
- [ ] User sees helpful error message
- [ ] Retry button works (if implemented)

#### B. Google Maps API Failure
1. Block Google Maps API in DevTools
2. Navigate to map page

**Expected:**
- [ ] Graceful fallback
- [ ] Error message displayed
- [ ] Rest of page functional

---

### 10. Automated Testing

Run existing test suites:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

**Verify:**
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No TypeScript errors
- [ ] No new test failures

---

## Post-Deployment Validation

### 1. Production Monitoring

**Check these metrics in production:**

#### Real User Monitoring (RUM)
- [ ] Average FCP decreased
- [ ] Average LCP decreased
- [ ] Average TTI decreased
- [ ] Bundle size reduced
- [ ] No increase in error rate

#### Analytics
- [ ] No increase in bounce rate
- [ ] No decrease in conversion rate
- [ ] No increase in page load abandonment

---

### 2. Rollback Plan

If issues found in production:

**Immediate Rollback:**
```bash
# Revert commit
git revert <commit-hash>

# Deploy previous version
npm run deploy
```

**Selective Rollback (per component):**
```typescript
// Revert import
import { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';

// Revert JSX
<GoogleMapContainer {...props} />
```

---

## Success Criteria

**Migration is successful if:**

✅ **All Tests Pass:**
- [ ] Build completes without errors
- [ ] All pages load correctly
- [ ] Maps render properly
- [ ] Charts display correctly
- [ ] No console errors

✅ **Performance Improves:**
- [ ] Lighthouse score +5-10 points
- [ ] LCP reduced by 500-700ms
- [ ] Bundle size reduced by ~250KB
- [ ] FCP reduced by 200-300ms

✅ **User Experience Maintained:**
- [ ] Smooth loading skeletons
- [ ] No visual regressions
- [ ] All interactions work
- [ ] Mobile experience good

✅ **No Regressions:**
- [ ] Error rate unchanged
- [ ] Conversion rate unchanged
- [ ] User engagement unchanged

---

## Approval Checklist

Before marking migration complete:

- [ ] All tests passed
- [ ] Performance improvements verified
- [ ] Manual testing complete
- [ ] Browser compatibility confirmed
- [ ] Mobile testing complete
- [ ] Error handling verified
- [ ] Documentation updated
- [ ] Team reviewed changes
- [ ] Rollback plan documented
- [ ] Monitoring setup confirmed

---

## Sign-Off

**Tested By:** _________________

**Date:** _________________

**Performance Score Before:** _____

**Performance Score After:** _____

**Issues Found:**
- [ ] None
- [ ] Minor (list below)
- [ ] Major (requires fix)

**Issues List:**
1.
2.
3.

**Approved for Production:**
- [ ] Yes
- [ ] No (reason: _______________)

---

**Notes:**
