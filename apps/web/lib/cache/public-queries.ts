import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { CACHE_TAGS, CACHE_DURATIONS } from './config';
import { extractSupabaseError } from './types';

/**
 * Cached function to get user by ID
 */
export const getCachedUser = unstable_cache(
  async (userId: string) => {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url, role, bio, phone')
      .eq('id', userId)
      .single();

    if (error) {
      const errorInfo = extractSupabaseError(error);
      logger.error('Error fetching user', error, {
        service: 'cache',
        userId,
        code: errorInfo.code || null,
        message: errorInfo.message || null,
      });
      return null;
    }

    return data;
  },
  ['user-by-id'],
  {
    tags: [CACHE_TAGS.USER_PROFILES],
    revalidate: CACHE_DURATIONS.MEDIUM,
  }
);

/**
 * Cached function to get contractors with ISR
 */
export const getCachedContractors = unstable_cache(
  async (limit = 20, offset = 0) => {
    const { data: contractors, error } = await serverSupabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        profile_image_url,
        bio,
        rating,
        total_jobs_completed,
        is_available,
        verified,
        city,
        country,
        created_at,
        contractor_skills (
          skill_name
        )
      `
      )
      .eq('role', 'contractor')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching contractors', error, {
        service: 'cache',
      });
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
 * Cached function to get service categories
 */
const getCachedServiceCategories = unstable_cache(
  async () => {
    const { data: categories, error } = await serverSupabase
      .from('service_categories')
      .select(
        `
        id,
        name,
        icon,
        color,
        display_order
      `
      )
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      logger.error('Error fetching service categories', error, {
        service: 'cache',
      });
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
const getCachedContractorById = unstable_cache(
  async (contractorId: string) => {
    const { data: contractor, error } = await serverSupabase
      .from('profiles')
      .select(
        `
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
      `
      )
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (error) {
      logger.error('Error fetching contractor', error, {
        service: 'cache',
        contractorId,
      });
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
