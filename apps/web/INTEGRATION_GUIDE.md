# Integration Guide: Using New UI Components

## 🎯 Quick Integration Examples

### 1. Enhanced Register Form

**File:** `apps/web/app/register/enhanced-register.tsx`

**To use:** Replace the existing register form or create a new route:

```tsx
// Option 1: Replace existing register page
// Copy enhanced-register.tsx content to register/page.tsx

// Option 2: Create new route
// Create app/register-v2/page.tsx and import EnhancedRegisterForm
```

**Features:**
- ✅ React Hook Form with Zod validation
- ✅ Real-time error feedback
- ✅ Success/error alerts
- ✅ Type-safe form handling
- ✅ Better UX with loading states

### 2. Enhanced Chart Component

**File:** `apps/web/components/ui/EnhancedChart.tsx`

**Replace LargeChart in dashboard:**

```tsx
// In apps/web/app/dashboard/page.tsx
import { EnhancedChart } from '@/components/ui/EnhancedChart';

// Replace:
<LargeChart 
  title="Revenue Overview"
  data={chartData}
/>

// With:
<EnhancedChart
  title="Revenue Overview"
  subtitle="Last 6 months"
  data={chartData.map(item => ({
    label: item.label,
    revenue: item.value,
    expenses: item.value * 0.6, // Optional
    profit: item.value * 0.4,   // Optional
  }))}
  type="line"
  height={300}
/>
```

**For contractor dashboard:**

```tsx
// In apps/web/app/contractor/dashboard-enhanced/page.tsx
import { DashboardRevenueChart } from '@/components/ui/EnhancedChart';

<DashboardRevenueChart
  data={revenueChartData.map((item, index) => ({
    month: item.label,
    revenue: item.value,
    expenses: item.value * 0.6,
    profit: item.value * 0.4,
  }))}
/>
```

### 3. Job Details Dialog

**File:** `apps/web/components/jobs/JobDetailsDialog.tsx`

**Use in bid page:**

```tsx
// In apps/web/app/contractor/bid/page.tsx
import { JobDetailsDialog } from '@/components/jobs/JobDetailsDialog';

// In your job list:
{jobs.map((job) => (
  <div key={job.id}>
    <h3>{job.title}</h3>
    <JobDetailsDialog
      job={job}
      onBid={async (jobId, amount) => {
        // Handle bid submission
        await submitBid(jobId, amount);
      }}
      existingBid={existingBids.find(b => b.job_id === job.id)}
      trigger={
        <Button variant="outline">View Details & Bid</Button>
      }
    />
  </div>
))}
```

## 📝 Step-by-Step Integration

### Step 1: Update Dashboard Charts

1. **Open** `apps/web/app/dashboard/page.tsx`
2. **Find** the `LargeChart` component usage
3. **Replace** with `EnhancedChart`:

```tsx
import { EnhancedChart } from '@/components/ui/EnhancedChart';

// Replace LargeChart import and usage
<EnhancedChart
  title="Revenue Overview"
  subtitle="Last 6 months"
  data={[
    { label: 'Jan', value: totalRevenue * 0.7 },
    { label: 'Feb', value: totalRevenue * 0.8 },
    // ... more data
  ].map(item => ({
    label: item.label,
    revenue: item.value,
  }))}
  type="line"
/>
```

### Step 2: Add Job Details Dialog to Bid Page

1. **Open** `apps/web/app/contractor/bid/page.tsx`
2. **Import** the dialog component:

```tsx
import { JobDetailsDialog } from '@/components/jobs/JobDetailsDialog';
```

3. **Replace** job detail views with dialog:

```tsx
// Find where jobs are displayed
{jobs.map((job) => (
  <JobDetailsDialog
    key={job.id}
    job={{
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      location: job.location,
      category: job.category,
      status: job.status,
      createdAt: job.createdAt,
    }}
    onBid={handleBidSubmit}
    trigger={<Button>View Details</Button>}
  />
))}
```

### Step 3: Enhance Register Form (Optional)

**Option A: Replace existing form**
1. Backup current `apps/web/app/register/page.tsx`
2. Copy content from `enhanced-register.tsx` to `register/page.tsx`
3. Test registration flow

**Option B: Create new route**
1. Create `apps/web/app/register-v2/page.tsx`
2. Copy content from `enhanced-register.tsx`
3. Test and migrate users gradually

## 🔧 Component Usage Examples

### Using Tabs Component

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="jobs">Jobs</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* Overview content */}
  </TabsContent>
  <TabsContent value="jobs">
    {/* Jobs content */}
  </TabsContent>
</Tabs>
```

### Using Select Component

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select onValueChange={(value) => setFilter(value)}>
  <SelectTrigger>
    <SelectValue placeholder="Filter by status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Jobs</SelectItem>
    <SelectItem value="posted">Posted</SelectItem>
    <SelectItem value="assigned">Assigned</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </SelectContent>
</Select>
```

### Using Alert Component

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

## 🎨 Styling Integration

All components use your existing design system:
- Colors from `theme.colors`
- Spacing from `theme.spacing`
- Typography from Tailwind classes
- Consistent with your existing UI

## 📦 Files Created

1. ✅ `apps/web/app/register/enhanced-register.tsx` - Enhanced registration form
2. ✅ `apps/web/components/ui/EnhancedChart.tsx` - Recharts-based charts
3. ✅ `apps/web/components/jobs/JobDetailsDialog.tsx` - Job details dialog

## 🚀 Next Steps

1. **Test the enhanced register form** - Try registering a new account
2. **Update dashboard charts** - Replace LargeChart with EnhancedChart
3. **Add job dialogs** - Integrate JobDetailsDialog in bid page
4. **Add more components** - Use Select, Tabs, Alert where needed

## 💡 Tips

- Start with one integration at a time
- Test thoroughly before deploying
- Keep the old components as backup initially
- Use TypeScript types for better IDE support
- Check console for any errors after integration

