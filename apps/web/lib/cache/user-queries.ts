import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { CACHE_TAGS, CACHE_DURATIONS } from './config';
import { extractSupabaseError, type MessageData } from './types';

/**
 * Cached function to get user jobs
 */
export const getCachedUserJobs = unstable_cache(
  async (userId: string, limit: number = 50) => {
    const { data, error } = await serverSupabase
      .from('jobs')
      .select(
        'id, title, status, budget, scheduled_start_date, scheduled_end_date, created_at, updated_at, category, location, homeowner_id, contractor_id'
      )
      .eq('homeowner_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Supabase errors have non-enumerable properties, so we need to extract them via JSON
      let errorInfo: Record<string, unknown> = {};
      try {
        errorInfo = JSON.parse(JSON.stringify(error));
      } catch {
        errorInfo = { message: String(error) };
      }

      logger.error('Error fetching user jobs', {
        service: 'cache',
        userId,
        code: errorInfo.code,
        message: errorInfo.message,
        details: errorInfo.details,
        hint: errorInfo.hint,
      });

      return [];
    }

    return data || [];
  },
  ['user-jobs'],
  {
    tags: [CACHE_TAGS.USER_JOBS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get user bids
 */
export const getCachedUserBids = unstable_cache(
  async (userId: string, jobIds: string[], limit: number = 10) => {
    if (jobIds.length === 0) {
      return [];
    }

    const { data, error } = await serverSupabase
      .from('bids')
      .select(
        `
        id,
        job_id,
        contractor_id,
        amount,
        status,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          category,
          location
        ),
        contractor:profiles!bids_contractor_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `
      )
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching user bids', error, {
        service: 'cache',
        userId,
      });
      return [];
    }

    return data || [];
  },
  ['user-bids'],
  {
    tags: [CACHE_TAGS.USER_BIDS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get user properties
 */
export const getCachedUserProperties = unstable_cache(
  async (userId: string, limit: number = 20) => {
    const { data, error } = await serverSupabase
      .from('properties')
      .select(
        'id, property_name, address, property_type, is_primary, created_at'
      )
      .eq('owner_id', userId)
      .limit(limit);

    if (error) {
      const errorInfo = extractSupabaseError(error);
      logger.error('Error fetching user properties', error, {
        service: 'cache',
        userId,
        code: errorInfo.code || null,
        message: errorInfo.message || null,
        details: errorInfo.details || null,
        hint: errorInfo.hint || null,
      });
      return [];
    }

    return data || [];
  },
  ['user-properties'],
  {
    tags: [CACHE_TAGS.USER_PROPERTIES],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get user messages (recent activity)
 */
export const getCachedUserMessages = unstable_cache(
  async (userId: string, limit: number = 10) => {
    const { data, error } = await serverSupabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const errorInfo = extractSupabaseError(error);
      logger.error('Error fetching user messages', error, {
        service: 'cache',
        userId,
        code: errorInfo.code || null,
        message: errorInfo.message || null,
      });
      return [];
    }

    // Return messages with content field (schema uses 'content' column)
    return (data || []).map((msg: MessageData) => ({
      ...msg,
      content: msg.content || '',
    }));
  },
  ['user-messages'],
  {
    tags: [CACHE_TAGS.USER_MESSAGES],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get contractor quotes for user jobs
 */
export const getCachedUserQuotes = unstable_cache(
  async (userId: string, jobIds: string[], limit: number = 10) => {
    if (jobIds.length === 0) {
      return [];
    }

    const { data, error } = await serverSupabase
      .from('contractor_quotes')
      .select(
        `
        id,
        job_id,
        contractor_id,
        total_amount,
        status,
        created_at,
        job:jobs!contractor_quotes_job_id_fkey (
          id,
          title,
          category
        ),
        contractor:profiles!contractor_quotes_contractor_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `
      )
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching user quotes', error, {
        service: 'cache',
        userId,
      });
      return [];
    }

    return data || [];
  },
  ['user-quotes'],
  {
    tags: [CACHE_TAGS.USER_BIDS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);
