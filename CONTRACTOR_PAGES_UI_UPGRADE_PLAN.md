# 🎨 Contractor Pages UI Upgrade Plan

**Status:** In Progress
**Goal:** Update all 18 contractor pages with Promage-inspired enhanced UI
**Target:** Professional, consistent, data-rich interfaces

---

## 📊 Current Status

### ✅ Completed (3/18)
1. **Dashboard Enhanced** - New `/contractor/dashboard-enhanced` page
2. **Quotes** - Already well-designed with good components
3. **Jobs & Bids** - Already has clean UI with good card layout

### 🎯 High Priority (Need Updates) - 7 pages
4. **Finance Dashboard** - Add DataTable for payments
5. **CRM Dashboard** - Add client table with DataTable
6. **Service Areas** - Convert to table layout
7. **Connections** - Enhanced card layout
8. **Gallery/Portfolio** - Grid layout with filters
9. **Profile** - Add circular progress, stats
10. **Business Card Editor** - Visual preview improvements

### 📝 Medium Priority - 5 pages
11. **Invoices** - Table layout for invoices
12. **Social Hub** - Post management with table
13. **Support** - FAQ and contact form
14. **Verification** - Status cards and progress
15. **Individual Bid Page** - Bid submission form

### ⚪ Low Priority (Already Functional) - 3 pages
16. **Quote Create** - Form-based, already good
17. **Contractor Public Profile** - [id] page
18. **Base Contractor Page** - Redirect page

---

## 🎨 New Components Created

### 1. **StatusBadge** ✅
**File:** `apps/web/components/ui/StatusBadge.tsx`

**Supports 15+ status types:**
- completed, approved, accepted (green)
- in_progress, on_going, assigned (orange)
- pending (gray)
- posted, open (blue)
- delayed, at_risk (red)
- in_review (yellow)
- draft (gray)
- sent (light blue)
- declined, cancelled (dark red)

**Usage:**
```tsx
<StatusBadge status="completed" size="md" />
```

### 2. **DataTable** ✅
**File:** `apps/web/components/ui/DataTable.tsx`

**Features:**
- Generic type support
- Custom column rendering
- Row click handlers
- Hover effects
- Empty state messages
- Title and actions support

**Usage:**
```tsx
<DataTable
  data={items}
  columns={[
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
  ]}
  onRowClick={(item) => router.push(`/details/${item.id}`)}
  title="Recent Items"
/>
```

### 3. **CircularProgress** ✅
**File:** `apps/web/components/ui/CircularProgress.tsx`

### 4. **ProjectTable** ✅
**File:** `apps/web/components/ui/ProjectTable.tsx`

### 5. **TodayTasks** ✅
**File:** `apps/web/components/ui/TodayTasks.tsx`

---

## 📋 Detailed Update Plans

### 🔥 HIGH PRIORITY UPDATES

---

#### 4. Finance Dashboard (`/contractor/finance`)
**Current:** Basic card layout with lists
**Target:** Professional financial dashboard with table

**Updates Needed:**

1. **Replace payment list with DataTable:**
```tsx
<DataTable
  data={payments}
  columns={[
    { key: 'created_at', label: 'Date', render: (p) => formatDate(p.created_at) },
    { key: 'amount', label: 'Amount', render: (p) => `£${p.amount}` },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'payer', label: 'From', width: '30%' },
  ]}
  title="Recent Payments"
  onRowClick={(payment) => router.push(`/payments/${payment.id}`)}
/>
```

2. **Add trend indicators to metric cards:**
- Show month-over-month revenue change
- Display percentage increase/decrease

3. **Add revenue chart:**
- Simple line chart for last 6 months
- Use existing data from payments table

**Files to Edit:**
- `apps/web/app/contractor/finance/components/FinanceDashboardClient.tsx`

---

#### 5. CRM Dashboard (`/contractor/crm`)
**Current:** Empty data (recently fixed with aggregation)
**Target:** Professional CRM with client table

**Updates Needed:**

1. **Add client DataTable:**
```tsx
<DataTable
  data={clients}
  columns={[
    { key: 'name', label: 'Client Name' },
    { key: 'email', label: 'Email' },
    { key: 'total_jobs', label: 'Jobs', align: 'center' },
    { key: 'total_spent', label: 'Total Spent', render: (c) => `£${c.total_spent.toFixed(2)}` },
    { key: 'last_contact', label: 'Last Contact', render: (c) => formatDate(c.last_contact) },
  ]}
  title="Client List"
  onRowClick={(client) => router.push(`/crm/clients/${client.id}`)}
/>
```

2. **Add client stats cards:**
- Total clients
- New this month
- Repeat clients
- Average lifetime value

3. **Add recent activity timeline:**
- Last 5 interactions with clients
- Phone calls, emails, job completions

**Files to Edit:**
- `apps/web/app/contractor/crm/components/CRMDashboardClient.tsx`

---

#### 6. Service Areas (`/contractor/service-areas`)
**Current:** Basic list (recently fixed)
**Target:** Table with map preview

**Updates Needed:**

1. **Convert to DataTable:**
```tsx
<DataTable
  data={serviceAreas}
  columns={[
    { key: 'location', label: 'Location' },
    { key: 'radius_km', label: 'Radius', render: (a) => `${a.radius_km} km` },
    { key: 'priority', label: 'Priority', align: 'center' },
    { key: 'is_active', label: 'Status', render: (a) => <StatusBadge status={a.is_active ? 'active' : 'inactive'} /> },
  ]}
  title="Coverage Areas"
  actions={
    <Button onClick={() => setShowAddModal(true)}>Add Area</Button>
  }
/>
```

2. **Add mini map preview:**
- Show all service areas on a map
- Use Mapbox or Google Maps API

3. **Add quick stats:**
- Total coverage area (km²)
- Active vs inactive areas
- Most recent additions

**Files to Edit:**
- `apps/web/app/contractor/service-areas/components/ServiceAreasClient.tsx`

---

#### 7. Connections (`/contractor/connections`)
**Current:** Empty (recently fixed with queries)
**Target:** Professional networking page

**Updates Needed:**

1. **Add two DataTables:**

**Pending Requests:**
```tsx
<DataTable
  data={connectionRequests}
  columns={[
    { key: 'requester.name', label: 'Name' },
    { key: 'requester.role', label: 'Role', render: (r) => <StatusBadge status={r.requester.role} /> },
    { key: 'createdAt', label: 'Requested', render: (r) => formatRelativeTime(r.createdAt) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div>
        <Button size="sm" onClick={() => acceptConnection(r.id)}>Accept</Button>
        <Button size="sm" variant="ghost" onClick={() => declineConnection(r.id)}>Decline</Button>
      </div>
    )},
  ]}
  title="Pending Requests"
/>
```

**Mutual Connections:**
```tsx
<DataTable
  data={mutualConnections}
  columns={[
    { key: 'user.name', label: 'Name' },
    { key: 'user.email', label: 'Email' },
    { key: 'user.role', label: 'Role' },
    { key: 'connectedAt', label: 'Connected', render: (c) => formatDate(c.connectedAt) },
  ]}
  title="Your Network"
  onRowClick={(conn) => router.push(`/profile/${conn.user.id}`)}
/>
```

2. **Add network stats:**
- Total connections
- New this month
- Connection growth chart

**Files to Edit:**
- `apps/web/app/contractor/connections/components/ConnectionsClient.tsx`

---

#### 8. Gallery/Portfolio (`/contractor/gallery`)
**Current:** Basic grid (recently fixed schema)
**Target:** Professional portfolio with filters

**Updates Needed:**

1. **Add filter tabs:**
```tsx
<div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
  {['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting'].map(category => (
    <button
      key={category}
      onClick={() => setFilter(category)}
      style={{
        padding: '8px 16px',
        borderRadius: '12px',
        border: filter === category ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
        backgroundColor: filter === category ? `${theme.colors.primary}15` : 'transparent',
      }}
    >
      {category}
    </button>
  ))}
</div>
```

2. **Enhance image grid:**
- Masonry layout (Pinterest-style)
- Lightbox for full-screen view
- Like counter display
- Project details overlay on hover

3. **Add upload button with drag-and-drop:**
- Modal with file upload
- Multiple file selection
- Image preview before upload
- Category selection

**Files to Edit:**
- `apps/web/app/contractor/gallery/components/ContractorGalleryClient.tsx`

---

#### 9. Profile (`/contractor/profile`)
**Current:** Basic profile form
**Target:** Professional profile with stats

**Updates Needed:**

1. **Add CircularProgress for profile completion:**
```tsx
<CircularProgress
  value={profileCompletion}
  size={180}
  label="Profile Complete"
/>
```

2. **Add profile strength indicators:**
- Missing fields checklist
- Recommendations to improve visibility
- Action items to complete

3. **Add stats section:**
- Total jobs completed
- Average rating
- Response time
- Profile views

**Files to Edit:**
- `apps/web/app/contractor/profile/page.tsx`
- `apps/web/app/contractor/profile/components/ProfileStats.tsx`

---

#### 10. Business Card Editor (`/contractor/card-editor`)
**Current:** Form-based editor
**Target:** Live preview editor

**Updates Needed:**

1. **Split screen layout:**
- Left: Form fields
- Right: Live preview of business card

2. **Add visual preview:**
- Real-time updates as user types
- Mobile and desktop preview toggle
- QR code generation for easy sharing

3. **Add template selector:**
- 3-4 pre-designed templates
- Color scheme picker
- Font style selector

**Files to Edit:**
- `apps/web/app/contractor/card-editor/components/CardEditorClient.tsx`

---

### 📝 MEDIUM PRIORITY UPDATES

---

#### 11. Invoices (`/contractor/invoices`)
**Updates:**
- Add DataTable for invoice list
- Add invoice status tracking
- Add total outstanding amount card
- Add payment due reminders

---

#### 12. Social Hub (`/contractor/social`)
**Updates:**
- Add DataTable for posts
- Add engagement metrics (likes, comments, shares)
- Add post scheduling feature
- Add content calendar view

---

#### 13. Support (`/contractor/support`)
**Updates:**
- Add FAQ accordion
- Add ticket submission form
- Add ticket history table
- Add status tracking

---

#### 14. Verification (`/contractor/verification`)
**Updates:**
- Add verification progress indicator
- Add document upload status
- Add requirements checklist
- Add verification timeline

---

#### 15. Individual Bid Page (`/contractor/bid/[jobId]`)
**Updates:**
- Add job details card
- Add bid submission form with validation
- Add similar jobs suggestions
- Add homeowner profile preview

---

## 🎨 Design System Standards

### Colors
```typescript
statusColors = {
  success: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  warning: { bg: '#FEF3C7', text: '#EA580C', border: '#FDE68A' },
  error: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  info: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  neutral: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
};
```

### Border Radius
- Cards: `20px`
- Buttons: `12px`
- Badges: `12px`
- Inputs: `12px`
- Tables: `20px` (container)

### Spacing
- Section gap: `theme.spacing[6]` (24px)
- Card padding: `theme.spacing[6]` (24px)
- Grid gap: `theme.spacing[4]` (16px)
- Item gap: `theme.spacing[3]` (12px)

### Typography
- Page title: `theme.typography.fontSize['3xl']` + `fontWeight.bold`
- Section title: `theme.typography.fontSize['2xl']` + `fontWeight.bold`
- Card title: `theme.typography.fontSize.xl` + `fontWeight.semibold`
- Body text: `theme.typography.fontSize.sm`
- Labels: `theme.typography.fontSize.xs` + `color.textSecondary`

---

## 🚀 Implementation Priority

### Week 1 (High Priority)
- [ ] Finance Dashboard - DataTable + trends
- [ ] CRM Dashboard - Client table + stats
- [ ] Service Areas - Table + map

### Week 2 (High Priority)
- [ ] Connections - Request + network tables
- [ ] Gallery - Filters + enhanced grid
- [ ] Profile - Progress indicator + stats

### Week 3 (Medium Priority)
- [ ] Business Card - Split screen editor
- [ ] Invoices - Table + tracking
- [ ] Social Hub - Post management

### Week 4 (Medium Priority)
- [ ] Support - FAQ + ticketing
- [ ] Verification - Progress tracking
- [ ] Individual Bid - Enhanced form

---

## 📦 Component Reusability

### Use StatusBadge For:
- Job status
- Quote status
- Payment status
- Connection status
- Verification status
- Invoice status

### Use DataTable For:
- Payment history
- Job list
- Client list
- Quote list
- Invoice list
- Connection list
- Service area list
- Post list

### Use CircularProgress For:
- Profile completion
- Project completion
- Goal progress
- Verification progress

### Use MetricCard For:
- Revenue metrics
- Job counts
- Client stats
- Performance indicators

---

## ✅ Quality Checklist

For each updated page, ensure:
- [ ] Uses consistent border radius (20px for cards)
- [ ] Uses StatusBadge for all status displays
- [ ] Uses DataTable for lists with 5+ items
- [ ] Has hover effects on interactive elements
- [ ] Has loading states
- [ ] Has empty states with helpful messages
- [ ] Uses theme colors (no hardcoded colors)
- [ ] Has responsive grid layouts
- [ ] Has proper spacing (theme.spacing)
- [ ] Has clear visual hierarchy

---

## 🎉 Expected Outcome

After all updates:
- ✅ Consistent UI across all 18 pages
- ✅ Professional, data-rich interfaces
- ✅ Improved user experience
- ✅ Better data visualization
- ✅ Enhanced interactivity
- ✅ Mobile-responsive designs
- ✅ Faster development with reusable components

**Overall Grade Target:** A+ (95+/100)

---

## 📝 Notes

1. All updates should use existing database queries (no new tables needed)
2. Maintain backward compatibility with existing APIs
3. Test on mobile devices after each update
4. Consider adding loading skeletons for better UX
5. Add error boundaries where appropriate
6. Document any new props or APIs

---

## 🔗 Quick Links

- [Enhanced Dashboard](apps/web/app/contractor/dashboard-enhanced/page.tsx)
- [StatusBadge Component](apps/web/components/ui/StatusBadge.tsx)
- [DataTable Component](apps/web/components/ui/DataTable.tsx)
- [CircularProgress Component](apps/web/components/ui/CircularProgress.tsx)
- [Theme System](apps/web/lib/theme.ts)
