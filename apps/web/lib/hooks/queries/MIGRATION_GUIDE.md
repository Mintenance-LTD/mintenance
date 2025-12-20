# Migration Guide: From Direct Fetch to React Query

This guide shows how to migrate existing data fetching code to use React Query hooks.

## Table of Contents

1. [Simple Fetch Replacement](#simple-fetch-replacement)
2. [useEffect + useState Patterns](#useeffect--usestate-patterns)
3. [Form Submissions](#form-submissions)
4. [Real-time Data](#real-time-data)
5. [Server Components](#server-components)
6. [Common Patterns](#common-patterns)

---

## Simple Fetch Replacement

### ❌ Before: Direct fetch in useEffect

```tsx
'use client';

import { useEffect, useState } from 'react';

function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        const data = await response.json();
        setJobs(data.jobs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return <div>{jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

### ✅ After: React Query hook

```tsx
'use client';

import { useJobs } from '@/lib/hooks/queries';

function JobsList() {
  const { data, isLoading, error } = useJobs();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

**Benefits:**
- 70% less code
- Automatic caching
- Request deduplication
- Background refetching
- No cleanup needed

---

## useEffect + useState Patterns

### ❌ Before: Fetching with dependencies

```tsx
'use client';

import { useEffect, useState } from 'react';

function JobDetails({ jobId }: { jobId: string }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchJob = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();

        if (!cancelled) {
          setJob(data.job);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (jobId) {
      fetchJob();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (loading) return <Skeleton />;
  if (error) return <Error message={error} />;
  if (!job) return <NotFound />;

  return <JobDetailsView job={job} />;
}
```

### ✅ After: React Query with enabled option

```tsx
'use client';

import { useJob } from '@/lib/hooks/queries';

function JobDetails({ jobId }: { jobId: string }) {
  const { data: job, isLoading, error } = useJob(jobId);

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  if (!job) return <NotFound />;

  return <JobDetailsView job={job} />;
}
```

**Benefits:**
- Automatic cleanup
- Automatic dependency tracking
- Race condition handling
- Cache persistence across unmounts

---

## Form Submissions

### ❌ Before: Manual form submission

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function CreateJobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const { job } = await response.json();

      // Manually invalidate or refetch related data
      // (usually forgotten!)

      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorAlert message={error} />}
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
```

### ✅ After: React Query mutation

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCreateJob } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';

function CreateJobForm() {
  const router = useRouter();
  const createJob = useCreateJob();

  const handleSubmit = async (formData) => {
    try {
      const job = await createJob.mutateAsync(formData);
      toast.success('Job created!');
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createJob.isPending}>
        {createJob.isPending ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
```

**Benefits:**
- Automatic cache invalidation
- No manual CSRF handling (in mutation function)
- Better loading state management
- Automatic error handling

---

## Real-time Data

### ❌ Before: Manual polling with setInterval

```tsx
'use client';

import { useEffect, useState } from 'react';

function MessagesList({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();
      setMessages(data.messages);
      setLoading(false);
    };

    // Initial fetch
    fetchMessages();

    // Poll every 10 seconds
    const interval = setInterval(fetchMessages, 10000);

    return () => clearInterval(interval);
  }, [conversationId]);

  if (loading) return <Spinner />;

  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

### ✅ After: React Query with refetchInterval

```tsx
'use client';

import { useMessages } from '@/lib/hooks/queries';

function MessagesList({ conversationId }) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useMessages(conversationId);

  const messages = data?.pages.flatMap(page => page.messages) || [];

  if (isLoading) return <Spinner />;

  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  );
}
```

**Benefits:**
- Automatic polling (configured in hook)
- Pauses when tab not visible
- Infinite scroll support built-in
- Automatic cleanup

---

## Server Components

### ❌ Before: Server component with client component

```tsx
// app/jobs/[id]/page.tsx (Server Component)
async function JobPage({ params }) {
  const { id } = params;

  const response = await fetch(`${process.env.API_URL}/api/jobs/${id}`, {
    cache: 'no-store', // No caching!
  });

  const { job } = await response.json();

  return <JobDetailsClient job={job} />;
}

// app/jobs/[id]/JobDetailsClient.tsx (Client Component)
'use client';

function JobDetailsClient({ job: initialJob }) {
  const [job, setJob] = useState(initialJob);
  const [loading, setLoading] = useState(false);

  // Have to manually refetch if data changes...
  const refetch = async () => {
    setLoading(true);
    const response = await fetch(`/api/jobs/${job.id}`);
    const data = await response.json();
    setJob(data.job);
    setLoading(false);
  };

  return <JobDetailsView job={job} onRefresh={refetch} loading={loading} />;
}
```

### ✅ After: Server prefetch with React Query hydration

```tsx
// app/jobs/[id]/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/react-query-client';
import { JobDetailsClient } from './JobDetailsClient';

async function JobPage({ params }) {
  const { id } = params;

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.jobs.details(id),
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${id}`);
      const data = await res.json();
      return data.job;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JobDetailsClient jobId={id} />
    </HydrationBoundary>
  );
}

// app/jobs/[id]/JobDetailsClient.tsx (Client Component)
'use client';

import { useJob } from '@/lib/hooks/queries';

function JobDetailsClient({ jobId }) {
  // Data is already available from server prefetch!
  const { data: job, isLoading, refetch } = useJob(jobId);

  if (isLoading) return <Skeleton />;

  return (
    <JobDetailsView
      job={job}
      onRefresh={refetch}
    />
  );
}
```

**Benefits:**
- Server-side rendering with data
- Client-side caching and refetching
- Seamless hydration
- Automatic background updates

---

## Common Patterns

### Pattern: Filtering/Search

#### ❌ Before

```tsx
function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ status: 'posted' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      setJobs(data.jobs);
      setLoading(false);
    };

    fetchJobs();
  }, [filters]);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />
      {loading ? <Spinner /> : <JobsGrid jobs={jobs} />}
    </div>
  );
}
```

#### ✅ After

```tsx
import { useJobs } from '@/lib/hooks/queries';

function JobsList() {
  const [filters, setFilters] = useState({ status: ['posted'] });
  const { data, isLoading } = useJobs(filters);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />
      {isLoading ? <Spinner /> : <JobsGrid jobs={data.jobs} />}
    </div>
  );
}
```

### Pattern: Optimistic Updates

#### ❌ Before

```tsx
function UpdateJobButton({ job }) {
  const [localJob, setLocalJob] = useState(job);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (updates) => {
    // Optimistic update
    setLocalJob({ ...localJob, ...updates });

    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      setLocalJob(data.job);
    } catch (error) {
      // Rollback on error
      setLocalJob(job);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={() => handleUpdate({ status: 'completed' })}>
    Mark Complete
  </button>;
}
```

#### ✅ After

```tsx
import { useUpdateJob } from '@/lib/hooks/queries';

function UpdateJobButton({ job }) {
  const updateJob = useUpdateJob(job.id);

  const handleUpdate = async (updates) => {
    await updateJob.mutateAsync(updates);
  };

  return (
    <button
      onClick={() => handleUpdate({ status: 'completed' })}
      disabled={updateJob.isPending}
    >
      Mark Complete
    </button>
  );
}
```

### Pattern: Dependent Queries

#### ❌ Before

```tsx
function ContractorProfile({ contractorId }) {
  const [contractor, setContractor] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch contractor
      const contractorRes = await fetch(`/api/contractors/${contractorId}`);
      const contractorData = await contractorRes.json();
      setContractor(contractorData.contractor);

      // Then fetch reviews
      const reviewsRes = await fetch(`/api/contractors/${contractorId}/reviews`);
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData.reviews);

      setLoading(false);
    };

    fetchData();
  }, [contractorId]);

  if (loading) return <Spinner />;

  return (
    <div>
      <ProfileCard contractor={contractor} />
      <ReviewsList reviews={reviews} />
    </div>
  );
}
```

#### ✅ After

```tsx
import { useContractor, useContractorReviews } from '@/lib/hooks/queries';

function ContractorProfile({ contractorId }) {
  const { data: contractor, isLoading: contractorLoading } = useContractor(contractorId);
  const { data: reviews, isLoading: reviewsLoading } = useContractorReviews(contractorId);

  if (contractorLoading) return <Spinner />;

  return (
    <div>
      <ProfileCard contractor={contractor} />
      {reviewsLoading ? <Spinner /> : <ReviewsList reviews={reviews} />}
    </div>
  );
}
```

---

## Migration Checklist

- [ ] Replace `useState` + `useEffect` with query hooks
- [ ] Remove manual loading/error state management
- [ ] Remove manual cleanup in useEffect
- [ ] Replace form submissions with mutation hooks
- [ ] Remove manual cache invalidation
- [ ] Replace polling with `refetchInterval`
- [ ] Use server-side prefetching for initial data
- [ ] Add optimistic updates where appropriate
- [ ] Remove manual CSRF token handling (now in hooks)
- [ ] Test that data refreshes correctly

## Next Steps

1. Start with read-only queries (useJobs, useContractors)
2. Migrate mutations one at a time (useCreateJob, useUpdateJob)
3. Add server-side prefetching for better initial load
4. Implement optimistic updates for better UX
5. Monitor with React Query DevTools

## Need Help?

- Check [README.md](./README.md) for hook documentation
- Open React Query DevTools to inspect cache
- Review query keys in `lib/react-query-client.ts`
- Look at existing hook implementations in `lib/hooks/queries/`
