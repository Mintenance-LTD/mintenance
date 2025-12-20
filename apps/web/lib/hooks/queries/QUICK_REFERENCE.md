# React Query Quick Reference

## Import Hooks

```typescript
import {
  // Jobs
  useJobs, useJob, useCreateJob, useUpdateJob,

  // Contractors
  useContractors, useContractor, useContractorReviews,

  // Profile
  useProfile, useAuth, useUpdateProfile,

  // Bids
  useJobBids, useSubmitBid, useAcceptBid,

  // Messages
  useConversations, useMessages, useSendMessage,
} from '@/lib/hooks/queries';
```

## Queries (Read Data)

### Basic Query

```tsx
const { data, isLoading, error } = useJobs();

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;
return <JobsList jobs={data.jobs} />;
```

### Query with Filters

```tsx
const { data } = useJobs({
  status: ['posted'],
  limit: 20
});
```

### Conditional Query

```tsx
// Only runs if jobId exists
const { data: job } = useJob(jobId);
```

### Manual Refetch

```tsx
const { data, refetch } = useJobs();

<button onClick={() => refetch()}>Refresh</button>
```

## Mutations (Write Data)

### Basic Mutation

```tsx
const createJob = useCreateJob();

const handleCreate = async (data) => {
  await createJob.mutateAsync(data);
};

<button
  onClick={() => handleCreate(jobData)}
  disabled={createJob.isPending}
>
  {createJob.isPending ? 'Creating...' : 'Create Job'}
</button>
```

### Mutation with Error Handling

```tsx
const updateJob = useUpdateJob(jobId);

const handleUpdate = async (updates) => {
  try {
    await updateJob.mutateAsync(updates);
    toast.success('Updated!');
  } catch (error) {
    toast.error(error.message);
  }
};
```

## Common Patterns

### Loading States

```tsx
const { data, isLoading, isFetching, isError } = useJobs();

// isLoading: true on first load
// isFetching: true when refetching in background
// isError: true if query failed
```

### Authentication Check

```tsx
const { isAuthenticated, isContractor, isHomeowner, user } = useAuth();

if (!isAuthenticated) return <Login />;
if (isContractor) return <ContractorDashboard />;
return <HomeownerDashboard />;
```

### Infinite Scroll

```tsx
const { data, fetchNextPage, hasNextPage } = useMessages(conversationId);

const messages = data?.pages.flatMap(page => page.messages) || [];

<InfiniteScroll
  dataLength={messages.length}
  next={fetchNextPage}
  hasMore={hasNextPage}
>
  {messages.map(msg => <Message key={msg.id} message={msg} />)}
</InfiniteScroll>
```

### Prefetch on Hover

```tsx
const prefetchJob = usePrefetchJob();

<Link
  href={`/jobs/${jobId}`}
  onMouseEnter={() => prefetchJob(jobId)}
>
  View Job
</Link>
```

## Server-Side Prefetching

```tsx
// Server Component
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/react-query-client';

export default async function Page({ params }) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.jobs.details(params.id),
    queryFn: async () => {
      const res = await fetch(`${process.env.API_URL}/api/jobs/${params.id}`);
      return res.json();
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent />
    </HydrationBoundary>
  );
}
```

## Cache Management

```tsx
import { queryClient, queryKeys, queryUtils } from '@/lib/react-query-client';

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) });

// Invalidate all jobs
queryUtils.invalidateJobs();

// Set data manually
queryClient.setQueryData(queryKeys.jobs.details(jobId), newJobData);
```

## Query Configuration

```tsx
const { data } = useJobs(filters, {
  staleTime: 1 * 60 * 1000,    // Fresh for 1 minute
  refetchInterval: 30 * 1000,  // Refetch every 30 seconds
  retry: 3,                     // Retry 3 times on failure
});
```

## Useful Query States

```tsx
const query = useJob(jobId);

query.data          // Query data
query.error         // Error object
query.isLoading     // First load
query.isFetching    // Fetching (including refetch)
query.isError       // Has error
query.isSuccess     // Successful
query.isPending     // Loading (v5 terminology)
query.refetch()     // Manual refetch
```

## Useful Mutation States

```tsx
const mutation = useCreateJob();

mutation.isPending    // Mutation in progress
mutation.isError      // Mutation failed
mutation.isSuccess    // Mutation succeeded
mutation.error        // Error object
mutation.mutate(data) // Fire-and-forget
mutation.mutateAsync(data) // With promise
mutation.reset()      // Reset mutation state
```

## DevTools

Press `Ctrl + Shift + D` (or click floating icon) to open React Query DevTools in development.

## Tips

✅ Use `enabled` option for conditional queries
✅ Always handle loading and error states
✅ Invalidate related queries after mutations
✅ Use optimistic updates for instant UX
✅ Prefetch on hover for better navigation
✅ Set appropriate staleTime based on data type
✅ Use query keys from centralized factory

❌ Don't fetch in useEffect
❌ Don't manage loading state manually
❌ Don't forget to invalidate after mutations
❌ Don't use different query keys for same data
