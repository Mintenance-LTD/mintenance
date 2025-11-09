# Mintenance Platform Routing Structure

## Overview
The Mintenance platform has **separate routing and layouts** for Homeowners and Contractors to provide role-specific experiences.

## Current Architecture

### Homeowner Routes (Root Level)
**Base Path**: `/` (root)
**Layout Shell**: `HomeownerLayoutShell` (uses `DashboardSidebar`)

```
/dashboard          → Homeowner dashboard with KPI cards
/jobs               → Jobs table with filters
/jobs/[id]          → Job details
/jobs/create        → Create new job
/contractors        → Browse and search contractors
/properties         → Manage homeowner properties
/scheduling         → View scheduled appointments
/payments           → Payment history and receipts
/messages           → Message conversations
/settings           → User settings
/help               → Help & support
```

**Navigation Items** (from `DashboardSidebar.tsx`):
- **Overview**: Dashboard, My Jobs
- **Operations**: Find Contractors, Scheduling, Messages, Payments
- **My Account**: My Properties, Settings, Help & Support

### Contractor Routes
**Base Path**: `/contractor`
**Layout**: `ContractorLayoutShell` (uses `AnimatedSidebar`)
**Auth Check**: `apps/web/app/contractor/layout.tsx` enforces contractor role

```
/contractor/dashboard-enhanced  → Contractor dashboard
/contractor/bid                 → Jobs & bid management
/contractor/connections         → Client connections
/contractor/service-areas       → Service area management
/contractor/quotes              → Quotes & invoices
/contractor/finance             → Finance dashboard
/messages                       → Shared messages (both roles)
/contractor/profile             → Contractor profile
/contractor/card-editor         → Business card editor
/contractor/gallery             → Portfolio gallery
/contractor/social              → Social hub
/contractor/crm                 → CRM system
/contractor/support             → Help & support
/contractor/verification        → Verification status
```

**Navigation Items** (from `ContractorLayoutShell.tsx`):
- **Overview**: Dashboard, Jobs & Bids, Connections, Service Areas
- **Operations**: Quotes & Invoices, Finance, Messages
- **Growth**: Profile, Business Card, Portfolio, Social Hub, CRM
- **Support**: Help & Support, Verification

## Role-Based Redirects

### Dashboard Redirect Logic
Location: `apps/web/app/dashboard/page.tsx`

```typescript
// Homeowners see the homeowner dashboard
// Contractors are redirected to their enhanced dashboard
if (user.role === 'contractor') {
  redirect('/contractor/dashboard-enhanced');
}
```

### Layout-Level Auth
Location: `apps/web/app/contractor/layout.tsx`

```typescript
// Prevents non-contractors from accessing contractor routes
if (!authUser || authUser.role !== 'contractor') {
  redirect('/login');
}
```

## Recently Implemented Updates

### ✅ Homeowner Side (Completed)
1. **Dashboard** (`/dashboard`)
   - KPI cards (Jobs, Bids Received, Properties & Subscriptions)
   - Upcoming Jobs & Estimates lists
   - Invoices chart
   - Activity feed

2. **Jobs** (`/jobs/page-new.tsx`)
   - Table-first view with sorting
   - Saved views (All Jobs, My Jobs, Urgent, Overdue)
   - Status & priority filters
   - Search functionality

3. **Properties** (`/properties/page.tsx`)
   - Card-based property list
   - Property details (beds, baths, sqft)
   - Job stats per property
   - Primary property designation

4. **Contractors** (`/contractors/page.tsx`)
   - Browse and search contractors
   - Contractor profiles with ratings
   - Specialty filtering
   - Availability status

5. **Navigation**
   - Homeowner-focused sidebar
   - Removed: Customers, Company, Reporting (contractor features)
   - Added: My Properties, Find Contractors

### 🔄 Contractor Side (Existing - Not Modified)
The contractor side **already has its own complete implementation**:
- Dashboard: `/contractor/dashboard-enhanced`
- Separate navigation via `AnimatedSidebar`
- Contractor-specific pages (bids, quotes, gallery, CRM, etc.)
- Different layout and branding

## Shared Components

### Shared Across Both Roles
- `/messages` - Message system (shared route)
- UI components (`Icon`, `StatusBadge`, `Button`, etc.)
- Theme system (`theme.ts`)
- Auth utilities

### Role-Specific Components
**Homeowner**:
- `HomeownerLayoutShell`
- `DashboardSidebar`
- `DashboardHeader`
- KPI dashboard components

**Contractor**:
- `ContractorLayoutShell`
- `AnimatedSidebar`
- Contractor-specific dashboard components

## How Updates Apply to Each Role

### Current State
✅ **Homeowner updates** (new dashboard, jobs table, customers):
   - Only affect homeowner routes (`/dashboard`, `/jobs`, `/customers`)
   - Use `HomeownerLayoutShell`
   - Accessed by users with `role: 'homeowner'`

❌ **Contractor routes**:
   - **NOT affected** by recent updates
   - Still use existing implementations
   - Use `ContractorLayoutShell`
   - Completely separate navigation and features

### To Apply Updates to Contractors

If you want contractors to see similar updates, you would need to:

1. **Create contractor-specific pages** under `/contractor/`:
   ```
   /contractor/jobs        → Contractor jobs view
   /contractor/customers   → Contractor customer list
   /contractor/scheduling  → Contractor scheduling
   ```

2. **Update ContractorLayoutShell** navigation to include new links

3. **Implement contractor-specific logic**:
   - Different data fetching (contractor's jobs vs homeowner's jobs)
   - Different permissions and views
   - Contractor-specific KPIs

4. **Share common components** where applicable:
   - Reuse `JobsTable`, `JobsFilters` components
   - Apply same design system and theme
   - Keep consistent UI patterns

## Next Steps

### For Homeowner Implementation
- [ ] Financials page with subscriptions/invoices
- [ ] Scheduling calendar
- [ ] Chat detail UI
- [ ] Customer detail page

### For Contractor Parity (If Needed)
- [ ] Decide which features contractors should have
- [ ] Create contractor-specific versions of new pages
- [ ] Update contractor navigation
- [ ] Implement contractor-specific data logic

## File Structure Summary

```
apps/web/app/
├── dashboard/              # Homeowner dashboard
│   ├── components/
│   │   ├── DashboardSidebar.tsx      # Homeowner nav
│   │   ├── DashboardHeader.tsx
│   │   ├── HomeownerLayoutShell.tsx  # Homeowner layout
│   │   ├── KpiCards.tsx
│   │   ├── UpcomingList.tsx
│   │   ├── InvoicesChart.tsx
│   │   └── ActivityFeed.tsx
│   └── page.tsx            # Homeowner dashboard page
├── jobs/
│   ├── components/
│   │   ├── JobsTable.tsx   # Reusable table component
│   │   └── JobsFilters.tsx # Reusable filters component
│   ├── page.tsx            # Old jobs page
│   └── page-new.tsx        # New jobs table page
├── customers/
│   └── page.tsx            # New customers page
├── contractor/             # All contractor routes
│   ├── layout.tsx          # Contractor auth wrapper
│   ├── components/
│   │   └── ContractorLayoutShell.tsx # Contractor layout
│   ├── dashboard-enhanced/
│   │   └── page.tsx        # Contractor dashboard
│   ├── bid/
│   ├── quotes/
│   ├── gallery/
│   └── ... (other contractor pages)
└── messages/               # Shared between both roles
    └── page.tsx
```

## Key Takeaways

1. **Separate but Equal**: Homeowners and contractors have completely separate routing hierarchies
2. **Layout Shells**: Each role has its own layout wrapper with role-specific navigation
3. **Auth Guards**: Contractor routes enforce role at layout level
4. **Recent Updates**: Homeowner side refactored (Oct 2025), Contractor side reviewed (Oct 2025)
5. **Shared Components**: UI components and theme are shared, but pages are role-specific

---

## Navigation Review Findings (October 2025)

### Homeowner Side Review
**Status**: ✅ **Fixed** - All navigation consistency issues resolved

**Issues Found and Fixed**:
1. ✅ `/jobs/create` - Had standalone header, now uses HomeownerLayoutShell
2. ✅ `/jobs/[jobId]` - Used PageHeader, now uses HomeownerLayoutShell  
3. ✅ `/settings` - Had custom sidebar, now uses HomeownerLayoutShell
4. ✅ `/help` - Kept standalone by design (public page)

**Result**: All homeowner pages now use consistent `HomeownerLayoutShell` except public pages.

---

### Contractor Side Review
**Status**: 🟢 **Excellent** with 2 minor issues

**Architecture Advantage**:
- ✅ Uses `layout.tsx` that automatically wraps ALL contractor pages
- ✅ Impossible to accidentally break navigation consistency
- ✅ New pages automatically get correct navigation
- ✅ Centralized auth enforcement

**Issues Found**:
1. ⚠️ **Messages Route Inconsistency**
   - Sidebar links to `/messages` which uses `HomeownerLayoutShell`
   - Contractors lose contractor navigation when viewing messages
   - **Recommendation**: Create `/contractor/messages` with ContractorLayoutShell
   - **Priority**: Medium - impacts UX

2. ❌ **Broken Analytics Link**
   - Dashboard quick action links to `/analytics` (doesn't exist)
   - Should link to `/contractor/reporting` instead
   - **Fix**: Update `apps/web/app/contractor/dashboard-enhanced/page.tsx` line 472
   - **Priority**: Medium - broken link

**Pages Verified**:
- ✅ Verification page - Correctly uses ContractorLayoutShell + PageLayout for content
- ✅ Public Profile `/contractor/[id]` - Intentionally has no shell (public viewing)

**See**: `CONTRACTOR_NAVIGATION_FINDINGS.md` for detailed analysis

---

## Layout Architecture Comparison

| Aspect | Contractor Side | Homeowner Side |
|--------|----------------|----------------|
| **Layout System** | ✅ `layout.tsx` wraps all pages | ✅ Manual wrapping (now consistent) |
| **Consistency** | ✅ 100% automatic | ✅ Fixed via refactoring |
| **Auth Enforcement** | ✅ Centralized in layout.tsx | ⚠️ Per-page checks |
| **Sidebar Component** | `AnimatedSidebar` | `DashboardSidebar` |
| **Navigation Items** | 15 items, 4 sections | 11 items, 3 sections |
| **Badge Notifications** | ✅ Messages, Connections, Bids | ❌ Not implemented |
| **Future-Proof** | ✅ New pages auto-wrapped | ⚠️ Requires manual wrapping |

**Recommendation**: Consider refactoring homeowner side to use layout.tsx pattern like contractor side.

