# React Query Examples - Real-World Usage

Complete, working examples of React Query usage in the Mintenance app.

## Example 1: Jobs Dashboard (Homeowner)

```tsx
// app/dashboard/components/JobsDashboard.tsx
'use client';

import { useState } from 'react';
import { useJobs, useCreateJob } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function JobsDashboard() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(['posted', 'assigned', 'in_progress']);

  // Fetch jobs with filters
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useJobs({
    status: statusFilter,
    limit: 20,
  });

  // Create job mutation
  const createJob = useCreateJob();

  const handleCreateJob = async (jobData: any) => {
    try {
      const newJob = await createJob.mutateAsync(jobData);
      toast.success('Job created successfully!');
      router.push(`/jobs/${newJob.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create job');
    }
  };

  if (isLoading) {
    return <JobsSkeletonGrid />;
  }

  if (error) {
    return (
      <ErrorCard
        title="Failed to load jobs"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={createJob.isPending}
          className="btn-primary"
        >
          {createJob.isPending ? 'Creating...' : 'Create New Job'}
        </button>
      </div>

      <FilterTabs
        selected={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'posted', label: 'Posted' },
          { value: 'assigned', label: 'Assigned' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ]}
      />

      {isFetching && !isLoading && (
        <div className="text-sm text-gray-500">Updating...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {data.jobs.length === 0 && (
        <EmptyState
          title="No jobs found"
          message="Create your first job to get started"
          action={
            <button onClick={() => setShowCreateModal(true)}>
              Create Job
            </button>
          }
        />
      )}
    </div>
  );
}
```

## Example 2: Job Details with Bids

```tsx
// app/jobs/[id]/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/react-query-client';
import { JobDetailsClient } from './JobDetailsClient';

export default async function JobDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Prefetch job and bids on server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.details(id),
      queryFn: async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${id}`);
        const data = await res.json();
        return data.job;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.bids(id),
      queryFn: async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${id}/bids`);
        const data = await res.json();
        return data.bids;
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JobDetailsClient jobId={id} />
    </HydrationBoundary>
  );
}

// app/jobs/[id]/JobDetailsClient.tsx (Client Component)
'use client';

import { useJob, useJobBids, useUpdateJob, useAcceptBid } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function JobDetailsClient({ jobId }: { jobId: string }) {
  const router = useRouter();

  // Fetch job and bids (already prefetched, so instant!)
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: bids, isLoading: bidsLoading } = useJobBids(jobId);

  // Mutations
  const updateJob = useUpdateJob(jobId);
  const acceptBid = useAcceptBid();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateJob.mutateAsync({ status: newStatus });
      toast.success('Job status updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    if (!confirm('Accept this bid? This will notify the contractor.')) return;

    try {
      await acceptBid.mutateAsync(bidId);
      toast.success('Bid accepted! Redirecting to payment...');
      router.push(`/jobs/${jobId}/payment`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (jobLoading) return <JobDetailsSkeleton />;
  if (!job) return <NotFound />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <JobHeader
        job={job}
        onStatusChange={handleStatusChange}
        isUpdating={updateJob.isPending}
      />

      <JobDescription job={job} />

      <section>
        <h2 className="text-xl font-semibold mb-4">
          Bids ({bids?.length || 0})
        </h2>

        {bidsLoading ? (
          <BidsSkeletonList />
        ) : bids && bids.length > 0 ? (
          <div className="space-y-3">
            {bids.map(bid => (
              <BidCard
                key={bid.id}
                bid={bid}
                onAccept={() => handleAcceptBid(bid.id)}
                isAccepting={acceptBid.isPending}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No bids yet"
            message="Contractors will submit bids soon"
          />
        )}
      </section>
    </div>
  );
}
```

## Example 3: Contractor Discovery (Infinite Scroll)

```tsx
// app/contractors/page.tsx
'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import InfiniteScroll from 'react-infinite-scroll-component';

export default function ContractorsBrowsePage() {
  const [filters, setFilters] = useState({
    skills: [] as string[],
    minRating: 0,
    verified: true,
  });

  // Infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.contractors.list(JSON.stringify(filters)),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      if (filters.minRating) params.set('minRating', String(filters.minRating));
      if (filters.verified) params.set('verified', 'true');
      filters.skills.forEach(s => params.append('skills', s));

      const res = await fetch(`/api/contractors?${params}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch contractors');

      return res.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
  });

  const contractors = data?.pages.flatMap(page => page.contractors) || [];

  if (isLoading) {
    return <ContractorsSkeletonGrid />;
  }

  if (error) {
    return <ErrorCard message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Find Contractors</h1>

      <ContractorFilters
        filters={filters}
        onChange={setFilters}
      />

      <InfiniteScroll
        dataLength={contractors.length}
        next={fetchNextPage}
        hasMore={hasNextPage || false}
        loader={<Spinner />}
        endMessage={
          <p className="text-center text-gray-500 py-4">
            You've seen all contractors
          </p>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contractors.map(contractor => (
            <ContractorCard key={contractor.id} contractor={contractor} />
          ))}
        </div>
      </InfiniteScroll>

      {isFetchingNextPage && (
        <div className="text-center py-4">
          <Spinner size="sm" />
          <span className="ml-2">Loading more...</span>
        </div>
      )}
    </div>
  );
}
```

## Example 4: Real-time Messages

```tsx
// app/messages/[conversationId]/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useMessages, useSendMessage, useMarkAsRead } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';

export default function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const { conversationId } = params;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages (polls every 10s)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
  } = useMessages(conversationId);

  const messages = data?.pages.flatMap(page => page.messages) || [];

  // Send message mutation
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(m => !m.read && m.sender_id !== 'current-user');

    unreadMessages.forEach(msg => {
      markAsRead.mutate(msg.id);
    });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

    try {
      await sendMessage.mutateAsync({
        conversation_id: conversationId,
        content: content.trim(),
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  if (isLoading) {
    return <MessagesSkeleton />;
  }

  return (
    <div className="flex flex-col h-screen">
      <ConversationHeader conversationId={conversationId} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            className="w-full py-2 text-sm text-blue-600"
          >
            Load Earlier Messages
          </button>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
        placeholder={sendMessage.isPending ? 'Sending...' : 'Type a message...'}
      />
    </div>
  );
}
```

## Example 5: Profile Settings with Optimistic Updates

```tsx
// app/settings/ProfileSettings.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useProfile, useUpdateProfile } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';

export function ProfileSettings() {
  const { data: user, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  if (isLoading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          First Name
        </label>
        <input
          {...register('first_name')}
          type="text"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Last Name
        </label>
        <input
          {...register('last_name')}
          type="text"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Phone
        </label>
        <input
          {...register('phone')}
          type="tel"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Bio
        </label>
        <textarea
          {...register('bio')}
          rows={4}
          className="textarea"
        />
      </div>

      <button
        type="submit"
        disabled={!isDirty || updateProfile.isPending}
        className="btn-primary"
      >
        {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
      </button>

      {updateProfile.isPending && (
        <p className="text-sm text-gray-500">
          Saving your changes...
        </p>
      )}
    </form>
  );
}
```

## Example 6: Contractor Bid Submission

```tsx
// app/contractor/bid/[jobId]/BidForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useJob, useSubmitBid } from '@/lib/hooks/queries';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function BidSubmissionForm({ jobId }: { jobId: string }) {
  const router = useRouter();

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useJob(jobId);

  // Submit bid mutation
  const submitBid = useSubmitBid();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      amount: 0,
      message: '',
      estimated_duration: '',
      start_date: '',
    },
  });

  const bidAmount = watch('amount');

  const onSubmit = async (data: any) => {
    try {
      await submitBid.mutateAsync({
        job_id: jobId,
        ...data,
      });

      toast.success('Bid submitted successfully!');
      router.push('/contractor/bids');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit bid');
    }
  };

  if (jobLoading) {
    return <BidFormSkeleton />;
  }

  if (!job) {
    return <NotFound />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <JobSummaryCard job={job} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Bid Amount (£)
          </label>
          <input
            {...register('amount', {
              required: 'Bid amount is required',
              min: { value: 50, message: 'Minimum bid is £50' },
              max: { value: 50000, message: 'Maximum bid is £50,000' },
            })}
            type="number"
            step="0.01"
            className="input"
          />
          {errors.amount && (
            <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
          )}

          {job.budget && bidAmount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Homeowner budget: £{job.budget}
              {bidAmount > job.budget && (
                <span className="text-orange-600 ml-2">
                  (Your bid is {((bidAmount / job.budget - 1) * 100).toFixed(0)}% higher)
                </span>
              )}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Message to Homeowner
          </label>
          <textarea
            {...register('message', {
              required: 'Please include a message',
              minLength: { value: 50, message: 'Message must be at least 50 characters' },
            })}
            rows={4}
            className="textarea"
            placeholder="Explain your approach, timeline, and why you're the best fit for this job..."
          />
          {errors.message && (
            <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Estimated Duration
            </label>
            <input
              {...register('estimated_duration')}
              type="text"
              placeholder="e.g., 2 days"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Earliest Start Date
            </label>
            <input
              {...register('start_date')}
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
            disabled={submitBid.isPending}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={submitBid.isPending}
          >
            {submitBid.isPending ? 'Submitting Bid...' : 'Submit Bid'}
          </button>
        </div>

        {submitBid.isPending && (
          <p className="text-sm text-center text-gray-500">
            Submitting your bid to the homeowner...
          </p>
        )}
      </form>
    </div>
  );
}
```

## Example 7: Search with Debouncing

```tsx
// app/contractors/SearchContractors.tsx
'use client';

import { useState, useMemo } from 'react';
import { useContractorSearch } from '@/lib/hooks/queries';
import { useDebounce } from '@/lib/hooks/useDebounce';

export function SearchContractors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Debounce search term to avoid excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Only search if query is at least 2 characters
  const { data, isLoading, error } = useContractorSearch(
    debouncedSearch,
    { skills: selectedSkills }
  );

  const resultCount = data?.contractors?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search contractors by name or business..."
          className="input flex-1"
        />

        <SkillsFilter
          selected={selectedSkills}
          onChange={setSelectedSkills}
        />
      </div>

      {isLoading && searchTerm.length >= 2 && (
        <div className="text-center py-8">
          <Spinner />
          <p className="text-sm text-gray-500 mt-2">Searching...</p>
        </div>
      )}

      {error && (
        <ErrorCard message={error.message} />
      )}

      {!isLoading && data && (
        <>
          <p className="text-sm text-gray-600">
            Found {resultCount} contractor{resultCount !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.contractors.map(contractor => (
              <ContractorCard key={contractor.id} contractor={contractor} />
            ))}
          </div>

          {resultCount === 0 && searchTerm.length >= 2 && (
            <EmptyState
              title="No contractors found"
              message="Try adjusting your search or filters"
            />
          )}
        </>
      )}

      {searchTerm.length > 0 && searchTerm.length < 2 && (
        <p className="text-sm text-gray-500 text-center py-8">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
```

These examples demonstrate:
- Basic queries and mutations
- Loading and error states
- Optimistic updates
- Infinite scroll/pagination
- Real-time data with polling
- Form integration
- Search with debouncing
- Server-side prefetching
- Dependent queries
- Conditional queries
