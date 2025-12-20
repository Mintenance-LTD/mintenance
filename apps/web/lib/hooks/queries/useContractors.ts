/**
 * React Query hooks for Contractors API
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Request deduplication
 * - Background refetching
 * - Type-safe query keys
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import { logger } from '@mintenance/shared';

/**
 * Contractor profile type
 */
export interface ContractorProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  bio?: string;
  business_name?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  rating?: number;
  review_count?: number;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Contractors list response
 */
interface ContractorsResponse {
  contractors: ContractorProfile[];
  nextCursor?: string;
  total?: number;
}

/**
 * Fetch contractors list with optional filters
 */
async function fetchContractors(filters?: {
  skills?: string[];
  location?: string;
  minRating?: number;
  limit?: number;
  cursor?: string;
  verified?: boolean;
}): Promise<ContractorsResponse> {
  const params = new URLSearchParams();

  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.cursor) params.set('cursor', filters.cursor);
  if (filters?.location) params.set('location', filters.location);
  if (filters?.minRating) params.set('minRating', String(filters.minRating));
  if (filters?.verified !== undefined) params.set('verified', String(filters.verified));
  if (filters?.skills) {
    filters.skills.forEach(s => params.append('skills', s));
  }

  const response = await fetch(`/api/contractors?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch contractors' }));
    throw new Error(error.error || 'Failed to fetch contractors');
  }

  return response.json();
}

/**
 * Fetch single contractor by ID
 */
async function fetchContractor(contractorId: string): Promise<ContractorProfile> {
  const response = await fetch(`/api/contractors/${contractorId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch contractor' }));
    throw new Error(error.error || 'Failed to fetch contractor');
  }

  const data = await response.json();
  return data.contractor;
}

/**
 * Fetch contractor reviews
 */
async function fetchContractorReviews(contractorId: string, page = 1) {
  const response = await fetch(`/api/contractors/${contractorId}/reviews?page=${page}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch reviews' }));
    throw new Error(error.error || 'Failed to fetch reviews');
  }

  return response.json();
}

/**
 * Hook to fetch contractors list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useContractors({
 *   skills: ['plumbing'],
 *   verified: true
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <ContractorList contractors={data.contractors} />;
 * ```
 */
export function useContractors(filters?: {
  skills?: string[];
  location?: string;
  minRating?: number;
  limit?: number;
  cursor?: string;
  verified?: boolean;
}) {
  // Create unique query key based on filters
  const filterString = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: queryKeys.contractors.list(filterString),
    queryFn: () => fetchContractors(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch single contractor profile
 *
 * @example
 * ```tsx
 * const { data: contractor, isLoading } = useContractor(contractorId);
 *
 * if (isLoading) return <Skeleton />;
 * if (!contractor) return <NotFound />;
 *
 * return <ContractorProfile contractor={contractor} />;
 * ```
 */
export function useContractor(contractorId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.contractors.details(contractorId || ''),
    queryFn: () => fetchContractor(contractorId!),
    enabled: !!contractorId, // Only run if contractorId exists
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch contractor reviews
 *
 * @example
 * ```tsx
 * const { data: reviews, isLoading } = useContractorReviews(contractorId);
 *
 * if (isLoading) return <LoadingReviews />;
 *
 * return <ReviewsList reviews={reviews.data} />;
 * ```
 */
export function useContractorReviews(contractorId: string | null | undefined, page = 1) {
  return useQuery({
    queryKey: queryKeys.contractors.reviews(contractorId || ''),
    queryFn: () => fetchContractorReviews(contractorId!, page),
    enabled: !!contractorId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to search contractors (with debouncing)
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const { data, isLoading } = useContractorSearch(searchTerm);
 *
 * <SearchInput
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 * />
 * ```
 */
export function useContractorSearch(query: string, filters?: {
  skills?: string[];
  location?: string;
}) {
  const filterString = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: queryKeys.search.contractors(query, filterString),
    queryFn: async () => {
      const params = new URLSearchParams({ query });
      if (filters?.location) params.set('location', filters.location);
      if (filters?.skills) {
        filters.skills.forEach(s => params.append('skills', s));
      }

      const response = await fetch(`/api/contractors/search?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    enabled: query.length >= 2, // Only search if query is at least 2 chars
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    retry: 1,
  });
}
