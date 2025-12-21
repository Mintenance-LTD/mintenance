# Mock Data Removal Summary

## Critical P0 Task: Remove Hardcoded Mock Data from Production Code

**Status**: PARTIALLY COMPLETED
**Date**: 2025-12-01

## Overview
This document tracks all instances of hardcoded mock data in the codebase and their remediation status.

---

## Files with Mock Data REMOVED ✅

### 1. apps/web/app/analytics/page.tsx ✅ COMPLETED
**Lines Removed**: 18-51
**What was removed**:
- Mock `spendingData` array (monthly spending data)
- Mock `categoryData` array (spending by category)
- Mock `metrics` array (dashboard metrics)

**Replaced with**:
- Real-time Supabase queries fetching user's jobs with payments
- Dynamic calculation of spending by month
- Dynamic calculation of spending by category
- Real metrics: total spent, completed jobs, active projects, avg job cost, contractors hired, properties count
- Added loading states and error handling
- Added useEffect hook to fetch data on component mount

**Database Tables Used**:
- jobs (with payments relation)
- properties

---

### 2. apps/web/app/contractors/page.tsx ✅ ALREADY FIXED
**Status**: Already using real Supabase data
**Database Tables Used**:
- users (contractors)
- contractor_skills
- reviews
- jobs

---

### 3. apps/web/app/find-contractors/page.tsx ✅ COMPLETED
**What changed**: Entire file refactored from client component to server component
**What was removed**:
- Mock contractors array with hardcoded data (lines 29-69 in old version)

**Replaced with**:
- Server-side Supabase queries (Next.js App Router pattern)
- Real contractor data with skills, reviews, and job stats
- Created separate client component FindContractorsClient.tsx for UI
- Batch queries for reviews and job statistics
- Calculated real ratings and completed jobs count

**Database Tables Used**:
- users (contractors)
- contractor_skills
- reviews
- jobs

---

## Files with Mock Data REQUIRING ATTENTION ⚠️

### 4. apps/web/app/contractor/reviews/page.tsx ⚠️ NEEDS FIXING
**Lines**: 68-160
**Mock data**:
- reviews: Review[] array with hardcoded review data
- reviewStats calculated from mock data
- ratingDistribution calculated from mock data
- reviewsByMonth array with hardcoded monthly stats

**Recommended Supabase query**:
```typescript
const { data: reviews } = await supabase
  .from('reviews')
  .select('*, job:jobs(title, id), reviewer:users!reviewer_id(first_name, last_name)')
  .eq('reviewed_id', user.id)
  .order('created_at', { ascending: false });
```

**Database Tables Needed**: reviews, jobs, users

---

### 5. apps/web/app/contractor/finance/page.tsx ⚠️ NEEDS FIXING
**Lines**: 60-140
**Mock data**:
- financeStats object with hardcoded financial metrics
- revenueByMonth array with monthly revenue/expenses
- revenueByCategory array with category breakdown
- invoices: Invoice[] array with hardcoded invoices

**Recommended Supabase query**:
```typescript
const { data: jobs } = await supabase
  .from('jobs')
  .select('*, payments(*), invoices(*)')
  .eq('contractor_id', user.id);
```

**Database Tables Needed**: jobs, payments, invoices

---

### 6. apps/web/app/contractor/connections/page.tsx ⚠️ NEEDS FIXING
**Lines**: 46-86
**Mock data**:
- connections: Connection[] array (lines 46-71)
- requests: ConnectionRequest[] array (lines 73-86)

**Recommended Supabase queries**:
```typescript
const { data: connections } = await supabase
  .from('connections')
  .select('*, user:users!connected_user_id(*)')
  .eq('user_id', user.id)
  .eq('status', 'accepted');

const { data: requests } = await supabase
  .from('connection_requests')
  .select('*, requester:users!requester_id(*)')
  .eq('recipient_id', user.id)
  .eq('status', 'pending');
```

**Database Tables Needed**: connections, connection_requests, users
**Note**: May need to create these tables

---

### 7. apps/web/app/admin/security/page.tsx ⚠️ NEEDS FIXING
**Lines**: 64-158
**Mock data**:
- securityStats object with hardcoded security metrics
- eventsByDay array with daily security events
- threatsByType array with threat categories
- securityEvents: SecurityEvent[] array with detailed security events

**Recommended Supabase query**:
```typescript
const { data: securityEvents } = await supabase
  .from('security_events')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(50);
```

**Database Tables Needed**: security_events, audit_logs
**Note**: May need to create security_events table

---

### 8. apps/web/app/admin/dashboard/page.tsx ⚠️ NEEDS REVIEW
**Status**: Contains comment "Mock data"
**Action needed**: Review and replace with real data

---

### 9. apps/web/app/admin/users/page.tsx ⚠️ NEEDS REVIEW
**Status**: Contains comment "Mock data"
**Action needed**: Review and replace with real data

---

### 10. apps/web/app/admin/payments/fees/page.tsx ⚠️ NEEDS REVIEW
**Status**: Contains comment "Mock data"
**Action needed**: Review and replace with real data

---

### 11. apps/web/app/admin/communications/page.tsx ⚠️ NEEDS REVIEW
**Status**: Contains comment "Mock data"
**Action needed**: Review and replace with real data

---

### 12. apps/web/app/admin/building-assessments/page.tsx ⚠️ NEEDS REVIEW
**Status**: Contains comment "Mock data"
**Action needed**: Review and replace with real data

---

## Service Files with Mock Fallbacks ⚠️

### apps/web/lib/services/ContractorService.ts
**Line**: 83
**Issue**: Returns getMockContractors() on error
**Recommended fix**: Remove mock fallback, handle errors properly, return empty array or throw error

### apps/web/lib/services/JobService.ts
**Lines**: 43, 53, 94-100+
**Issue**: Returns getMockJobs() on error + contains full mock implementation
**Recommended fix**: Remove mock fallback and mock implementation entirely

---

## Progress Summary

### ✅ Completed (3 files)
1. apps/web/app/analytics/page.tsx - Replaced with real Supabase queries
2. apps/web/app/contractors/page.tsx - Already using real data
3. apps/web/app/find-contractors/page.tsx - Converted to server component with real data

### ⚠️ Remaining (9+ files)
1. apps/web/app/contractor/reviews/page.tsx
2. apps/web/app/contractor/finance/page.tsx
3. apps/web/app/contractor/connections/page.tsx
4. apps/web/app/admin/security/page.tsx
5. apps/web/app/admin/dashboard/page.tsx
6. apps/web/app/admin/users/page.tsx
7. apps/web/app/admin/payments/fees/page.tsx
8. apps/web/app/admin/communications/page.tsx
9. apps/web/app/admin/building-assessments/page.tsx
10. Service files with mock fallbacks

---

## Database Schema Requirements

### Tables that may need to be created:
1. connections - for contractor/homeowner connections
2. connection_requests - for pending connection requests
3. invoices - for contractor invoices (if not exists)
4. security_events - for admin security monitoring

### Existing tables being used:
- users
- jobs
- payments
- properties
- reviews
- contractor_skills
- audit_logs (assumed to exist)

---

## Recommendations

### Priority 1 (Critical - User-Facing):
1. Fix contractor/reviews/page.tsx - contractors need to see real reviews
2. Fix contractor/finance/page.tsx - contractors need real financial data
3. Fix contractor/connections/page.tsx - contractors need real connections

### Priority 2 (Important - Admin Tools):
4. Fix admin/security/page.tsx - security monitoring is critical
5. Fix admin/dashboard/page.tsx - admin overview needs real data
6. Fix admin/users/page.tsx - user management needs real data

### Priority 3 (Nice to Have):
7. Fix remaining admin pages
8. Remove mock fallbacks from service files
9. Add proper error boundaries and loading states

---

## Testing Checklist

For each fixed file, verify:
- [ ] No hardcoded data arrays
- [ ] Supabase queries are optimized (avoid N+1 queries)
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Empty states implemented
- [ ] Data types match database schema
- [ ] Page renders correctly with real data
- [ ] Page renders correctly with no data

---

## Implementation Pattern

All changes should follow the pattern established in analytics/page.tsx:

1. Use useEffect for client components OR server components for static data
2. Add loading state
3. Handle errors gracefully
4. Calculate derived stats from real data
5. Avoid using mock data as fallback - show empty state instead
6. Consider creating a @/lib/queries directory for reusable query functions
7. Create TypeScript interfaces for all data shapes
8. Test with both populated and empty databases

---

**Last Updated**: 2025-12-01
**Updated By**: Claude Code Agent
