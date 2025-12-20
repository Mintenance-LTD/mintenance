# React Query Hooks - Mintenance Web App

This directory contains React Query hooks for data fetching, caching, and state management in the Mintenance Next.js application.

## Features

✅ **Automatic Caching** - Data cached for 5 minutes (configurable per hook)
✅ **Request Deduplication** - Multiple components requesting same data = single request
✅ **Background Refetching** - Automatic updates when data becomes stale
✅ **Optimistic Updates** - Instant UI updates before server confirmation
✅ **Type Safety** - Full TypeScript support with type inference
✅ **Error Handling** - Smart retry logic with exponential backoff
✅ **Offline Support** - Graceful degradation when network unavailable

## Available Hooks

### Jobs

```typescript
import { useJobs, useJob, useCreateJob, useUpdateJob } from '@/lib/hooks/queries';

// Fetch jobs list
const { data, isLoading, error } = useJobs({ status: ['posted'] });

// Fetch single job
const { data: job } = useJob(jobId);

// Create job
const createJob = useCreateJob();
await createJob.mutateAsync({ title: 'Fix sink', category: 'plumbing' });

// Update job
const updateJob = useUpdateJob(jobId);
await updateJob.mutateAsync({ status: 'completed' });

// Prefetch on hover
const prefetchJob = usePrefetchJob();
<Link onMouseEnter={() => prefetchJob(jobId)}>View Job</Link>
```

### Contractors

```typescript
import { useContractors, useContractor, useContractorReviews } from '@/lib/hooks/queries';

// Fetch contractors list
const { data } = useContractors({
  skills: ['plumbing'],
  verified: true,
  minRating: 4.0
});

// Fetch contractor profile
const { data: contractor } = useContractor(contractorId);

// Fetch reviews
const { data: reviews } = useContractorReviews(contractorId);

// Search contractors
const { data: results } = useContractorSearch(searchQuery, {
  location: 'London',
  skills: ['electrical']
});
```

### Profile & Authentication

```typescript
import { useProfile, useAuth, useUpdateProfile } from '@/lib/hooks/queries';

// Get current user (replaces old useCurrentUser)
const { data: user, isLoading } = useProfile();

// Auth utilities
const { isAuthenticated, isContractor, isHomeowner } = useAuth();

// Update profile
const updateProfile = useUpdateProfile();
await updateProfile.mutateAsync({
  first_name: 'John',
  bio: 'Professional plumber'
});
```

### Bids

```typescript
import { useJobBids, useSubmitBid, useAcceptBid } from '@/lib/hooks/queries';

// Fetch bids for a job
const { data: bids } = useJobBids(jobId);

// Submit a bid
const submitBid = useSubmitBid();
await submitBid.mutateAsync({
  job_id: jobId,
  amount: 500,
  message: 'I can start next week'
});

// Accept a bid
const acceptBid = useAcceptBid();
await acceptBid.mutateAsync(bidId);
```

### Messages

```typescript
import { useConversations, useMessages, useSendMessage } from '@/lib/hooks/queries';

// Fetch conversations (auto-refreshes every 30s)
const { data: conversations } = useConversations();

// Fetch messages with infinite scroll
const {
  data,
  fetchNextPage,
  hasNextPage,
} = useMessages(conversationId);

const messages = data?.pages.flatMap(page => page.messages) || [];

// Send message
const sendMessage = useSendMessage();
await sendMessage.mutateAsync({
  conversation_id: conversationId,
  content: 'Hello!'
});
```

## Usage Patterns

### Basic Query

```tsx
function JobsList() {
  const { data, isLoading, error, refetch } = useJobs();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data.jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Conditional Queries

```tsx
function JobDetails({ jobId }: { jobId?: string }) {
  // Query only runs if jobId exists
  const { data: job, isLoading } = useJob(jobId);

  if (!jobId) return <SelectJob />;
  if (isLoading) return <Skeleton />;

  return <JobDetailsView job={job} />;
}
```

### Mutations with Loading State

```tsx
function CreateJobForm() {
  const createJob = useCreateJob();
  const router = useRouter();

  const handleSubmit = async (data) => {
    try {
      const job = await createJob.mutateAsync(data);
      toast.success('Job created!');
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button
        type="submit"
        disabled={createJob.isPending}
      >
        {createJob.isPending ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```tsx
function UpdateJobStatus({ jobId, currentStatus }) {
  const updateJob = useUpdateJob(jobId);

  const handleStatusChange = async (newStatus) => {
    // UI updates immediately, rolls back on error
    await updateJob.mutateAsync({ status: newStatus });
  };

  return (
    <StatusSelector
      value={currentStatus}
      onChange={handleStatusChange}
      disabled={updateJob.isPending}
    />
  );
}
```

### Dependent Queries

```tsx
function ContractorWithReviews({ contractorId }) {
  // Fetch contractor first
  const { data: contractor } = useContractor(contractorId);

  // Only fetch reviews after contractor is loaded
  const { data: reviews } = useContractorReviews(
    contractor?.id // Only runs when contractor exists
  );

  return (
    <div>
      <ContractorProfile contractor={contractor} />
      <ReviewsList reviews={reviews} />
    </div>
  );
}
```

### Pagination with Infinite Scroll

```tsx
function MessagesList({ conversationId }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const messages = data?.pages.flatMap(page => page.messages) || [];

  return (
    <div>
      <InfiniteScroll
        dataLength={messages.length}
        next={fetchNextPage}
        hasMore={hasNextPage}
        loader={<Spinner />}
      >
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </InfiniteScroll>
    </div>
  );
}
```

### Prefetching on Hover

```tsx
function JobCard({ job }) {
  const prefetchJob = usePrefetchJob();

  return (
    <Link
      href={`/jobs/${job.id}`}
      onMouseEnter={() => prefetchJob(job.id)}
    >
      <h3>{job.title}</h3>
      <p>{job.description}</p>
    </Link>
  );
}
```

## Server-Side Usage (Next.js 16 App Router)

### Prefetching in Server Components

```tsx
// app/jobs/[id]/page.tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/react-query-client';
import { JobDetailsClient } from './JobDetailsClient';

export default async function JobPage({ params }) {
  const { id } = params;

  // Prefetch job data on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.jobs.details(id),
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${id}`);
      const data = await res.json();
      return data.job;
    },
  });

  // Dehydrate state for client
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <JobDetailsClient jobId={id} />
    </HydrationBoundary>
  );
}
```

### Client Component Using Prefetched Data

```tsx
// app/jobs/[id]/JobDetailsClient.tsx
'use client';

import { useJob } from '@/lib/hooks/queries';

export function JobDetailsClient({ jobId }) {
  // Data is already prefetched, so this returns immediately
  const { data: job, isLoading } = useJob(jobId);

  // isLoading will be false on initial render!
  if (!job) return null;

  return <JobDetailsView job={job} />;
}
```

## Configuration

Query configuration is centralized in `lib/react-query-client.ts`:

```typescript
{
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 10 * 60 * 1000,          // 10 minutes
  refetchOnWindowFocus: false,     // Disabled
  refetchOnReconnect: true,        // Enabled
  retry: 2,                        // Retry failed requests 2 times
}
```

Override per-hook:

```tsx
const { data } = useJobs(filters, {
  staleTime: 1 * 60 * 1000, // 1 minute instead of 5
  refetchInterval: 30 * 1000, // Poll every 30 seconds
});
```

## Query Keys

All query keys are centralized and type-safe:

```typescript
import { queryKeys } from '@/lib/react-query-client';

queryKeys.jobs.all                    // ['jobs']
queryKeys.jobs.list(filters)          // ['jobs', 'list', filters]
queryKeys.jobs.details(jobId)         // ['jobs', 'detail', jobId]
queryKeys.contractors.details(id)     // ['contractors', 'detail', id]
queryKeys.messages.conversation(id)   // ['messages', 'conversation', id]
```

## Cache Invalidation

```typescript
import { queryClient, queryUtils } from '@/lib/react-query-client';

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) });

// Invalidate all jobs queries
queryUtils.invalidateJobs();

// Invalidate all contractors queries
queryUtils.invalidateContractors();

// Invalidate user profile
queryUtils.invalidateUser(userId);
```

## Error Handling

```tsx
function JobsList() {
  const { data, error, isError, refetch } = useJobs();

  if (isError) {
    return (
      <ErrorDisplay
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return <JobsGrid jobs={data.jobs} />;
}
```

## DevTools

React Query DevTools are enabled in development mode:

```tsx
// Already configured in app/providers.tsx
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
```

Access at `http://localhost:3000` - look for the floating React Query icon in bottom-right corner.

## Best Practices

1. **Use enabled option** for conditional queries
2. **Always handle loading and error states**
3. **Prefer optimistic updates** for better UX
4. **Use prefetching** for anticipated navigation
5. **Invalidate related queries** after mutations
6. **Keep query keys consistent** using the centralized factory
7. **Set appropriate staleTime** based on data volatility
8. **Use infinite queries** for paginated lists

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions from existing patterns.

## Troubleshooting

### Data not updating after mutation

Ensure you're invalidating the correct queries:

```tsx
const createJob = useCreateJob();

// ✅ Good - invalidates jobs list
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
}

// ❌ Bad - doesn't invalidate
onSuccess: () => {
  // No invalidation
}
```

### Multiple requests for same data

Check that you're using the same query key:

```tsx
// ✅ Good - same key, request deduplicated
const { data: job1 } = useJob(jobId);
const { data: job2 } = useJob(jobId); // Uses cached data

// ❌ Bad - different keys
const { data: job1 } = useQuery({ queryKey: ['job', jobId] });
const { data: job2 } = useQuery({ queryKey: ['jobs', jobId] }); // Different key!
```

### Stale data showing

Adjust staleTime or use refetchInterval:

```tsx
const { data } = useConversations({
  staleTime: 30 * 1000,        // Consider fresh for 30s
  refetchInterval: 30 * 1000,  // Auto-refetch every 30s
});
```
