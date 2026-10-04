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
      .select(
        // postcode + city pulled in so the Mint Editorial sidebar
        // user card can render "Homeowner · SW18" instead of the email,
        // matching the design mock.
        'id, first_name, last_name, email, avatar_url, profile_image_url, role, bio, phone, postcode, city'
      )
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
      .from('profile_directory')
      .select(
        `
        id,
        first_name,
        last_name,
        profile_image_url,
        bio,
        rating,
        total_jobs_completed,
        is_available,
        verified,
        city,
        country,
        created_at,
        contractor_skills!contractor_id (
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
