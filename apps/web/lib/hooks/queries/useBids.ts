/**
 * React Query hooks for Bids API
 *
 * Features:
 * - Automatic caching
 * - Optimistic updates for bid submission
 * - Type-safe mutations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import { logger } from '@mintenance/shared';

/**
 * Bid data type
 */
export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  contractor?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
    rating?: number;
  };
}

/**
 * Fetch bids for a job
 */
async function fetchJobBids(jobId: string): Promise<Bid[]> {
  const response = await fetch(`/api/jobs/${jobId}/bids`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch bids' }));
    throw new Error(error.error || 'Failed to fetch bids');
  }

  const data = await response.json();
  return data.bids || [];
}

/**
 * Fetch contractor's bids
 */
async function fetchContractorBids(): Promise<Bid[]> {
  const response = await fetch('/api/contractor/bids', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch bids' }));
    throw new Error(error.error || 'Failed to fetch bids');
  }

  const data = await response.json();
  return data.bids || [];
}

/**
 * Submit a bid
 */
async function submitBid(bidData: {
  job_id: string;
  amount: number;
  message?: string;
  estimated_duration?: string;
  start_date?: string;
}): Promise<Bid> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch('/api/bids', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify(bidData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to submit bid' }));
    throw new Error(error.error || 'Failed to submit bid');
  }

  const data = await response.json();
  return data.bid;
}

/**
 * Accept a bid
 */
async function acceptBid(bidId: string): Promise<Bid> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch(`/api/bids/${bidId}/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to accept bid' }));
    throw new Error(error.error || 'Failed to accept bid');
  }

  const data = await response.json();
  return data.bid;
}

/**
 * Hook to fetch bids for a specific job
 *
 * @example
 * ```tsx
 * const { data: bids, isLoading } = useJobBids(jobId);
 *
 * if (isLoading) return <Spinner />;
 *
 * return <BidsList bids={bids} />;
 * ```
 */
export function useJobBids(jobId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.bids(jobId || ''),
    queryFn: () => fetchJobBids(jobId!),
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic data)
    retry: 2,
  });
}

/**
 * Hook to fetch contractor's own bids
 *
 * @example
 * ```tsx
 * const { data: myBids, isLoading } = useContractorBids();
 *
 * return <MyBidsList bids={myBids} />;
 * ```
 */
export function useContractorBids() {
  return useQuery({
    queryKey: ['contractor', 'bids'],
    queryFn: fetchContractorBids,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to submit a bid
 *
 * @example
 * ```tsx
 * const submitBidMutation = useSubmitBid();
 *
 * const handleSubmit = async (bidData) => {
 *   try {
 *     await submitBidMutation.mutateAsync(bidData);
 *     toast.success('Bid submitted successfully');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useSubmitBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitBid,
    onSuccess: (newBid) => {
      // Invalidate job bids query
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.bids(newBid.job_id) });

      // Invalidate contractor's bids list
      queryClient.invalidateQueries({ queryKey: ['contractor', 'bids'] });

      logger.info('Bid submitted successfully', {
        service: 'bids',
        bidId: newBid.id,
        jobId: newBid.job_id,
      });
    },
    onError: (error) => {
      logger.error('Failed to submit bid', error, {
        service: 'bids',
      });
    },
  });
}

/**
 * Hook to accept a bid
 *
 * @example
 * ```tsx
 * const acceptBidMutation = useAcceptBid();
 *
 * const handleAccept = async (bidId) => {
 *   await acceptBidMutation.mutateAsync(bidId);
 *   router.push(`/jobs/${jobId}/payment`);
 * };
 * ```
 */
export function useAcceptBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptBid,
    onSuccess: (acceptedBid) => {
      // Invalidate all bids for this job
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.bids(acceptedBid.job_id) });

      // Invalidate job details (status changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.details(acceptedBid.job_id) });

      logger.info('Bid accepted successfully', {
        service: 'bids',
        bidId: acceptedBid.id,
        jobId: acceptedBid.job_id,
      });
    },
    onError: (error) => {
      logger.error('Failed to accept bid', error, {
        service: 'bids',
      });
    },
  });
}
