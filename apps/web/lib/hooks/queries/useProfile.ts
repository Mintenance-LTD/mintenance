/**
 * React Query hooks for User Profile API
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Optimistic updates for profile changes
 * - Type-safe mutations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';

/**
 * Profile update data
 */
interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  business_name?: string;
  profile_image_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch current user profile
 */
async function fetchProfile(): Promise<User> {
  const response = await fetch('/api/auth/session', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch profile' }));
    throw new Error(error.error || 'Failed to fetch profile');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Fetch user by ID (for viewing other users)
 */
async function fetchUserProfile(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch user' }));
    throw new Error(error.error || 'Failed to fetch user');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Update user profile
 */
async function updateProfile(updates: ProfileUpdateData): Promise<User> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch('/api/users/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
    throw new Error(error.error || 'Failed to update profile');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Hook to fetch current user profile
 *
 * This replaces the old useCurrentUser hook with React Query
 *
 * @example
 * ```tsx
 * const { data: user, isLoading, error } = useProfile();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <LoginPrompt />;
 *
 * return <Welcome user={user} />;
 * ```
 */
export function useProfile() {
  return useQuery({
    queryKey: ['user', 'profile', 'current'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry if unauthorized
      const err = error as Error & { status?: number };
      if (err?.message?.includes('Unauthorized') || err?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch any user's profile by ID
 *
 * @example
 * ```tsx
 * const { data: user } = useUserProfile(userId);
 *
 * return <UserCard user={user} />;
 * ```
 */
export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.profile(userId || ''),
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to update current user profile
 *
 * @example
 * ```tsx
 * const updateProfileMutation = useUpdateProfile();
 *
 * const handleSave = async (data) => {
 *   try {
 *     await updateProfileMutation.mutateAsync(data);
 *     toast.success('Profile updated');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 * ```
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', 'profile', 'current'] });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(['user', 'profile', 'current']);

      // Optimistically update
      queryClient.setQueryData(['user', 'profile', 'current'], (old: unknown) => ({
        ...(old as Record<string, unknown>),
        ...updates,
      }));

      return { previousProfile };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(['user', 'profile', 'current'], context.previousProfile);
      }

      logger.error('Failed to update profile', error, {
        service: 'profile',
      });
    },
    onSuccess: (updatedProfile) => {
      // Update cache with server response
      queryClient.setQueryData(['user', 'profile', 'current'], updatedProfile);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(updatedProfile.id) });

      logger.info('Profile updated successfully', {
        service: 'profile',
        userId: updatedProfile.id,
      });
    },
  });
}

/**
 * Hook to check if user is authenticated
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPrompt />;
 *
 * return <ProtectedContent />;
 * ```
 */
export function useAuth() {
  const { data: user, isLoading, error } = useProfile();

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isContractor: user?.role === 'contractor',
    isHomeowner: user?.role === 'homeowner',
    isAdmin: user?.role === 'admin',
  };
}
