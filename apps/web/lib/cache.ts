import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
  CONTRACTORS: 'contractors',
  JOBS: 'jobs',
  SERVICES: 'services',
  CATEGORIES: 'categories',
  USER_PROFILES: 'user-profiles',
} as const;

export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Cached function to get contractors with ISR
 */
export const getCachedContractors = unstable_cache(
  async (limit = 20, offset = 0) => {
    const { data: contractors, error } = await serverSupabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_image_url,
        bio,
        rating,
        total_jobs_completed,
        is_available,
        email_verified,
        city,
        country,
        created_at,
        contractor_skills (
          skill_name
        )
      `)
      .eq('role', 'contractor')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching contractors:', error);
      return [];
    }

    return contractors || [];
  },
  ['contractors'],
  {
    tags: [CACHE_TAGS.CONTRACTORS],
    revalidate: CACHE_DURATIONS.MEDIUM,
  }
);

/**
 * Cached function to get jobs with ISR
 */
export const getCachedJobs = unstable_cache(
  async (limit = 20, offset = 0) => {
    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        location,
        budget,
        status,
        priority,
        created_at,
        updated_at,
        photos,
        category,
        homeowner:homeowner_id (
          first_name,
          last_name,
          city
        )
      `)
      .eq('status', 'posted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    return jobs || [];
  },
  ['jobs'],
  {
    tags: [CACHE_TAGS.JOBS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get service categories
 */
export const getCachedServiceCategories = unstable_cache(
  async () => {
    const { data: categories, error } = await serverSupabase
      .from('service_categories')
      .select(`
        id,
        name,
        icon,
        color,
        display_order
      `)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching service categories:', error);
      return [];
    }

    return categories || [];
  },
  ['service-categories'],
  {
    tags: [CACHE_TAGS.CATEGORIES],
    revalidate: CACHE_DURATIONS.VERY_LONG,
  }
);

/**
 * Cached function to get contractor by ID
 */
export const getCachedContractorById = unstable_cache(
  async (contractorId: string) => {
    const { data: contractor, error } = await serverSupabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_image_url,
        bio,
        rating,
        total_jobs_completed,
        is_available,
        city,
        country,
        created_at,
        contractor_skills (
          skill_name
        ),
        reviews (
          id,
          rating,
          comment,
          created_at,
          reviewer:reviewer_id (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (error) {
      console.error('Error fetching contractor:', error);
      return null;
    }

    return contractor;
  },
  ['contractor-by-id'],
  {
    tags: [CACHE_TAGS.CONTRACTORS, CACHE_TAGS.USER_PROFILES],
    revalidate: CACHE_DURATIONS.MEDIUM,
  }
);

/**
 * Cache invalidation utilities
 */
export async function revalidateContractors() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.CONTRACTORS);
}

export async function revalidateJobs() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.JOBS);
}

export async function revalidateServiceCategories() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.CATEGORIES);
}

export async function revalidateUserProfile(userId: string) {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.USER_PROFILES);
}
