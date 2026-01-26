# API Services Integration Examples

## Sprint 4 - Route Decomposition Examples

### 1. Jobs Routes (`/api/jobs`)

Replace the monolithic 854-line route with clean imports:

```typescript
// apps/web/app/api/jobs/route.ts
import { jobController } from '@mintenance/api-services';

export async function GET(request: NextRequest) {
  return jobController.listJobs(request);
}

export async function POST(request: NextRequest) {
  return jobController.createJob(request);
}
```

### 2. Job Details Routes (`/api/jobs/[id]`)

Replace the 773-line route with:

```typescript
// apps/web/app/api/jobs/[id]/route.ts
import { jobDetailsController } from '@mintenance/api-services';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return jobDetailsController.getJob(request, context);
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return jobDetailsController.updateJob(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  return jobDetailsController.patchJob(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return jobDetailsController.deleteJob(request, context);
}
```

### 3. Payment Routes

Create clean payment endpoints:

```typescript
// apps/web/app/api/payments/create-intent/route.ts
import { paymentController } from '@mintenance/api-services';

export async function POST(request: NextRequest) {
  return paymentController.createPaymentIntent(request);
}
```

```typescript
// apps/web/app/api/payments/release-escrow/route.ts
import { paymentController } from '@mintenance/api-services';

export async function POST(request: NextRequest) {
  return paymentController.releaseEscrow(request);
}
```

```typescript
// apps/web/app/api/payments/refund/route.ts
import { paymentController } from '@mintenance/api-services';

export async function POST(request: NextRequest) {
  return paymentController.processRefund(request);
}
```

```typescript
// apps/web/app/api/payments/history/route.ts
import { paymentController } from '@mintenance/api-services';

export async function GET(request: NextRequest) {
  return paymentController.getPaymentHistory(request);
}
```

### 4. Using Services Directly (Advanced)

For custom business logic, use services directly:

```typescript
// apps/web/app/api/custom/job-analytics/route.ts
import { JobService, JobDetailsService } from '@mintenance/api-services';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromCookies();

  const jobService = new JobService({
    supabase: serverSupabase,
    enableAIAssessment: true,
  });

  const detailsService = new JobDetailsService({
    supabase: serverSupabase,
    enableBuildingSurveyor: true,
  });

  // Custom analytics logic
  const [userJobs, aiAnalytics] = await Promise.all([
    jobService.listJobs({
      userId: user.id,
      userRole: user.role,
      limit: 100,
    }),
    detailsService.runAIAnalysis(
      request.nextUrl.searchParams.get('jobId'),
      [...], // images
      true // run building survey
    ),
  ]);

  return NextResponse.json({
    jobs: userJobs,
    analytics: aiAnalytics,
  });
}
```

### 5. Status Management

Use the JobStatusService for complex status transitions:

```typescript
// apps/web/app/api/jobs/[id]/status/route.ts
import { JobStatusService } from '@mintenance/api-services';
import { serverSupabase } from '@/lib/api/supabaseServer';

const statusService = new JobStatusService({
  supabase: serverSupabase,
  enableNotifications: true,
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUserFromCookies();
  const job = await getJob(params.id);

  // Get available transitions for this user
  const transitions = statusService.getAvailableTransitions(job, user);

  return NextResponse.json({ transitions });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUserFromCookies();
  const { status, reason } = await request.json();

  try {
    const updatedJob = await statusService.updateJobStatus(
      params.id,
      status,
      user,
      reason
    );

    // Send notifications
    await statusService.handleStatusChangeNotifications(
      params.id,
      status,
      user
    );

    return NextResponse.json(updatedJob);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

### 6. Custom Validators

Use validators for form validation on the frontend:

```typescript
// apps/web/components/JobEditForm.tsx
import { fullUpdateSchema } from '@mintenance/api-services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function JobEditForm({ job }) {
  const form = useForm({
    resolver: zodResolver(fullUpdateSchema),
    defaultValues: job,
  });

  const onSubmit = async (data) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      // Handle response
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 7. Parallel Testing During Migration

Test both old and new implementations:

```typescript
// apps/web/app/api/jobs/test-comparison/route.ts
import { oldJobHandler } from '../route.old';
import { jobController } from '@mintenance/api-services';

export async function GET(request: NextRequest) {
  const [oldResponse, newResponse] = await Promise.allSettled([
    oldJobHandler.GET(request),
    jobController.listJobs(request),
  ]);

  // Compare responses
  const comparison = {
    oldStatus: oldResponse.status === 'fulfilled' ? 'success' : 'failed',
    newStatus: newResponse.status === 'fulfilled' ? 'success' : 'failed',
    match: JSON.stringify(oldResponse.value) === JSON.stringify(newResponse.value),
  };

  // Log differences for monitoring
  if (!comparison.match) {
    console.error('Route output mismatch', {
      old: oldResponse.value,
      new: newResponse.value,
    });
  }

  // Return old response in production, new in staging
  const useNew = process.env.USE_NEW_ROUTES === 'true';
  return useNew ? newResponse.value : oldResponse.value;
}
```

## Benefits of This Architecture

### 1. Code Reduction
- **Before**: 854 lines in `/api/jobs/route.ts`
- **After**: 10 lines
- **Reduction**: 98.8%

### 2. Testability
Each layer can be tested independently:
```typescript
// tests/services/JobService.test.ts
import { JobService } from '@mintenance/api-services';

describe('JobService', () => {
  it('should create job with validation', async () => {
    const service = new JobService({ supabase: mockSupabase });
    const job = await service.createJob(mockData, mockUser);
    expect(job).toBeDefined();
  });
});
```

### 3. Reusability
Services can be used across different routes:
```typescript
// Use JobService in admin routes
// apps/web/app/api/admin/jobs/bulk-update/route.ts
import { JobService } from '@mintenance/api-services';

export async function POST(request: NextRequest) {
  const service = new JobService({ supabase });
  const jobs = await request.json();

  const results = await Promise.all(
    jobs.map(job => service.updateJob(job.id, job.data, adminUser))
  );

  return NextResponse.json({ updated: results.length });
}
```

### 4. Type Safety
Full TypeScript support with Zod validation:
```typescript
import type { CreateJobData } from '@mintenance/api-services';

const jobData: CreateJobData = {
  title: 'Fix leaking faucet',
  description: 'Kitchen sink is dripping',
  budget: 150,
  // TypeScript will enforce all required fields
};
```

### 5. Maintainability
Clear separation of concerns:
- **Controller**: HTTP handling
- **Service**: Business logic
- **Repository**: Data access
- **Validator**: Input validation

## Migration Checklist

- [ ] Install `@mintenance/api-services` package
- [ ] Update route files to use controllers
- [ ] Test with parallel execution
- [ ] Monitor performance metrics
- [ ] Enable feature flags for gradual rollout
- [ ] Remove old route files after verification

## Next Steps

1. Apply same pattern to remaining routes:
   - `/api/webhooks/stripe/route.ts` (909 lines)
   - `/api/contractor/submit-bid/route.ts` (495 lines)
   - `/api/contracts/route.ts` (493 lines)

2. Create shared utilities:
   - Common error handlers
   - Rate limiting middleware
   - Authentication helpers

3. Add monitoring:
   - Performance metrics
   - Error tracking
   - Usage analytics