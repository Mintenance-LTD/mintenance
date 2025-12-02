# 2025 UI Migration Operational Checklist

This document provides operational steps for the gradual rollout of the 2025 UI.

## Environment Variables Required

Add these to your deployment environment:

```bash
# Phase 1: Kill switch (keep false unless emergency)
DISABLE_2025_PAGES=false

# Phase 2: Beta Rollout (10% traffic)
NEXT_PUBLIC_ENABLE_2025_DASHBOARD=false
NEXT_PUBLIC_ROLLOUT_PERCENTAGE=10

# Phase 3: Expanded Rollout (50% traffic)
# NEXT_PUBLIC_ROLLOUT_PERCENTAGE=50

# Phase 4: Full Rollout (100% traffic)
# NEXT_PUBLIC_ENABLE_2025_DASHBOARD=true
# NEXT_PUBLIC_ROLLOUT_PERCENTAGE=100
```

---

## Phase 2: Beta Rollout - 10% Traffic

### Pre-requisites Checklist

- [ ] All 2025 files compile without errors
- [ ] Database migration `20250129000001_add_message_reactions.sql` applied
- [ ] `/api/messages/[id]/react` endpoint deployed
- [ ] `revenue-queries.ts` returning real data
- [ ] Accessibility tested with `prefers-reduced-motion: reduce`
- [ ] Lighthouse audit score > 90 on sample pages

### Enable Beta Access

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_ROLLOUT_PERCENTAGE=10
   ```

2. For internal testers, set cookie via browser console:
   ```javascript
   document.cookie = "beta-features=true; path=/; max-age=31536000";
   ```

3. Or for user preference:
   ```javascript
   document.cookie = "dashboard-version=2025; path=/; max-age=31536000";
   ```

### Priority Pages for Initial Testing

1. `/dashboard` - Homeowner dashboard (page2025.tsx)
2. `/jobs` - Jobs listing (page2025.tsx)
3. `/messages` - Messaging with reactions (page2025.tsx)

### Monitoring Checklist

- [ ] Monitor error rates in application logs
- [ ] Track page load times (target: < 3s)
- [ ] Watch for Framer Motion console errors
- [ ] Check Sentry/error tracking for new issues
- [ ] Collect user feedback via survey

---

## Phase 3: Expanded Rollout - 50% Traffic

### Prerequisites

- [ ] No critical bugs from Phase 2
- [ ] Positive user feedback
- [ ] Error rates within acceptable limits

### Enable 50% Rollout

```bash
NEXT_PUBLIC_ROLLOUT_PERCENTAGE=50
```

### Additional Pages Enabled

- `/contractor/dashboard-enhanced` - Contractor dashboard
- `/settings` - Settings page
- `/notifications` - Notifications
- `/payments` - Payments

### A/B Test Metrics

- [ ] Compare engagement metrics (time on page, clicks)
- [ ] Measure conversion rates (job creation, bid submission)
- [ ] Document any regressions

---

## Phase 4: Full Rollout - 100% Traffic

### Prerequisites

- [ ] 48-72 hours stable at 50%
- [ ] No regressions identified
- [ ] A/B test shows positive or neutral results

### Enable Full Rollout

```bash
NEXT_PUBLIC_ENABLE_2025_DASHBOARD=true
NEXT_PUBLIC_ROLLOUT_PERCENTAGE=100
```

### Monitoring (48-72 hours)

- [ ] All 67 page2025.tsx files functioning correctly
- [ ] All API endpoints responding properly
- [ ] Critical user flows tested end-to-end

---

## Phase 5: Cleanup and Archival

### After Successful Full Rollout

**IMPORTANT:** Only proceed after 48-72 hours of stable 100% rollout.

1. **Archive Legacy Files** (handled by migration script)
   - Move legacy `page.tsx` files to `_archive/pre-2025/`
   - Rename `page2025.tsx` to `page.tsx`

2. **Archive Legacy Components**
   - `LargeChart.tsx` → `_archive/pre-2025/`
   - `JobStatusStepper.tsx` → `_archive/pre-2025/`
   - `PrimaryMetricCard.tsx` → `_archive/pre-2025/`

3. **Remove Unused Dependencies**
   ```bash
   npm uninstall recharts
   ```

4. **Remove Feature Flag Code**
   - Remove `is2025FeatureEnabled()` from middleware.ts
   - Remove environment variable checks
   - Clean up cookie handling

---

## Rollback Procedure

If critical issues occur during rollout:

### Emergency Kill Switch

```bash
DISABLE_2025_PAGES=true
```

### Gradual Rollback

1. Reduce percentage:
   ```bash
   NEXT_PUBLIC_ROLLOUT_PERCENTAGE=0
   ```

2. Users can manually switch via cookie:
   ```javascript
   document.cookie = "dashboard-version=current; path=/; max-age=31536000";
   ```

---

## Feature Flag Reference

| Variable | Purpose | Values |
|----------|---------|--------|
| `DISABLE_2025_PAGES` | Emergency kill switch | `true` / `false` |
| `NEXT_PUBLIC_ENABLE_2025_DASHBOARD` | Global enable | `true` / `false` |
| `NEXT_PUBLIC_ROLLOUT_PERCENTAGE` | Gradual rollout % | `0` - `100` |

| Cookie | Purpose | Values |
|--------|---------|--------|
| `beta-features` | Beta tester opt-in | `true` / `false` |
| `dashboard-version` | User preference | `2025` / `current` |

