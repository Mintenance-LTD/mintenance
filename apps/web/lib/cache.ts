import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// Types for cache data
interface HomeownerData {
  id: string;
  first_name: string;
  last_name: string;
  city?: string;
  profile_image_url?: string;
}

interface JobWithPhotos {
  id: string;
  photos?: string[] | unknown;
  homeowner_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  timeline?: unknown;
  photoUrls?: string[];
  homeowner?: HomeownerData | null;
  [key: string]: unknown;
}

interface PhotoData {
  job_id: string;
  photo_url: string;
  display_order?: number;
}

interface SubscriptionData {
  id: string;
  status: string;
  current_period_end?: string;
  next_billing_date?: string;
  [key: string]: unknown;
}

interface MessageData {
  id: string;
  content?: string;
  message_text?: string;
  sender_id: string;
  created_at: string;
  [key: string]: unknown;
}

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_date?: string;
  due_date?: string;
}

/**
 * Helper function to extract Supabase error information
 * Supabase errors have non-enumerable properties, so we use JSON.parse(JSON.stringify())
 */
function extractSupabaseError(error: unknown): Record<string, unknown> {
  if (!error) {
    return { message: 'Unknown error' };
  }
  
  try {
    // JSON.stringify/parse works for Supabase errors even when properties aren't enumerable
    return JSON.parse(JSON.stringify(error));
  } catch {
    return { message: String(error) };
  }
}

/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
  CONTRACTORS: 'contractors',
  JOBS: 'jobs',
  SERVICES: 'services',
  CATEGORIES: 'categories',
  USER_PROFILES: 'user-profiles',
  USER_JOBS: 'user-jobs',
  USER_BIDS: 'user-bids',
  USER_PAYMENTS: 'user-payments',
  USER_PROPERTIES: 'user-properties',
  USER_SUBSCRIPTIONS: 'user-subscriptions',
  USER_MESSAGES: 'user-messages',
  USER_RECOMMENDATIONS: 'user-recommendations',
  USER_ONBOARDING: 'user-onboarding',
} as const;

export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Generic cache query wrapper for easy caching of any function
 */
export function cacheQuery<T>(
  key: string | string[],
  queryFn: () => Promise<T>,
  revalidate: number = CACHE_DURATIONS.SHORT,
  tags?: string[]
): Promise<T> {
  const cacheKey = Array.isArray(key) ? key : [key];
  return unstable_cache(queryFn, cacheKey, {
    revalidate,
    tags: tags || [],
  })();
}

/**
 * Cached function to get user by ID
 */
export const getCachedUser = unstable_cache(
  async (userId: string) => {
    const { data, error } = await serverSupabase
      .from('users')
      .select('id, first_name, last_name, email, profile_image_url, role, company_name, city, country')
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
 * Cached function to get jobs with ISR
 */
export const getCachedJobs = unstable_cache(
  async (limit = 20, offset = 0) => {
    try {
      // Simplified query without relations that might cause issues
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
          homeowner_id
        `)
        .eq('status', 'posted')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching jobs', error, {
          service: 'cache',
        });
        return [];
      }

      // Fetch homeowner data separately to avoid relation issues
      const homeownerIds = [...new Set((jobs || []).map((job: JobWithPhotos) => job.homeowner_id).filter(Boolean))];
      const homeownersMap: Record<string, HomeownerData> = {};
      
      if (homeownerIds.length > 0) {
        try {
          const { data: homeowners } = await serverSupabase
            .from('users')
            .select('id, first_name, last_name, city, profile_image_url')
            .in('id', homeownerIds);
          
          if (homeowners) {
            homeowners.forEach((homeowner: HomeownerData) => {
              homeownersMap[homeowner.id] = homeowner;
            });
          }
        } catch (homeownerError) {
          logger.warn('Could not fetch homeowner data', {
            service: 'cache',
            error: homeownerError,
          });
        }
      }

      // Process jobs to normalize photos array
      const processedJobs = (jobs || []).map((job: JobWithPhotos) => {
        let photoUrls: string[] = [];
        
        // Try to get photos from photos JSONB field
        if (job.photos) {
          if (Array.isArray(job.photos)) {
            photoUrls = job.photos.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
          } else if (typeof job.photos === 'string') {
            try {
              const parsed = JSON.parse(job.photos);
              if (Array.isArray(parsed)) {
                photoUrls = parsed.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
              }
            } catch {
              photoUrls = [];
            }
          }
        }
        
        return {
          ...job,
          photoUrls,
          // Add homeowner data from separate query
          homeowner: job.homeowner_id ? (homeownersMap[job.homeowner_id] || null) : null,
          // Add optional fields that might not exist
          latitude: job.latitude || null,
          longitude: job.longitude || null,
          timeline: job.timeline || null,
        };
      });

      // Optionally fetch photos from jobs_photos table for jobs that don't have photos
      // This is done asynchronously and won't block the main flow
      try {
        const jobsNeedingPhotos = processedJobs.filter(job => !job.photoUrls || job.photoUrls.length === 0);
        if (jobsNeedingPhotos.length > 0) {
          const jobIds = jobsNeedingPhotos.map(job => job.id);
          const { data: photosData } = await serverSupabase
            .from('jobs_photos')
            .select('job_id, photo_url, display_order')
            .in('job_id', jobIds)
            .order('display_order', { ascending: true });

          if (photosData && photosData.length > 0) {
            // Group photos by job_id
            const photosByJob: Record<string, string[]> = {};
            photosData.forEach((photo: PhotoData) => {
              if (!photosByJob[photo.job_id]) {
                photosByJob[photo.job_id] = [];
              }
              photosByJob[photo.job_id].push(photo.photo_url);
            });

            // Update jobs with photos from jobs_photos table
            processedJobs.forEach((job: JobWithPhotos) => {
              if (photosByJob[job.id]) {
                job.photoUrls = photosByJob[job.id];
              }
            });
          }
        }
        } catch (photosError) {
          // Silently fail - photos from jobs_photos table are optional
          logger.warn('Could not fetch photos from jobs_photos table', {
            service: 'cache',
            error: photosError,
          });
        }

      return processedJobs;
    } catch (err) {
      logger.error('Unexpected error in getCachedJobs', err, {
        service: 'cache',
      });
      return [];
    }
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
      logger.error('Error fetching contractor', error, {
        service: 'cache',
        contractorId: id,
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

/**
 * Cache invalidation utilities
 */
export async function revalidateContractors() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.CONTRACTORS);
  } catch (error) {
    logger.error('Error revalidating contractors', error, {
      service: 'cache',
    });
  }
}

export async function revalidateJobs() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.JOBS);
  } catch (error) {
    logger.error('Error revalidating jobs', error, {
      service: 'cache',
    });
  }
}

export async function revalidateServiceCategories() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.CATEGORIES);
  } catch (error) {
    logger.error('Error revalidating categories', error, {
      service: 'cache',
    });
  }
}

export async function revalidateUserProfile(userId: string) {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.USER_PROFILES);
  } catch (error) {
    logger.error('Error revalidating user profile', error, {
      service: 'cache',
      userId: id,
    });
  }
}

/**
 * Cached function to get user jobs
 */
export const getCachedUserJobs = unstable_cache(
  async (userId: string, limit: number = 50) => {
    const { data, error } = await serverSupabase
      .from('jobs')
      .select('id, title, status, budget, scheduled_start_date, scheduled_end_date, created_at, updated_at, category, location, homeowner_id, contractor_id')
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
      .select(`
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
        contractor:users!bids_contractor_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
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
 * Cached function to get user payments
 * Note: Uses payment_tracking table if payments table doesn't exist
 */
export const getCachedUserPayments = unstable_cache(
  async (userId: string, limit: number = 50): Promise<PaymentData[]> => {
    // Try payments table first, fallback to payment_tracking
    let data: PaymentData[] | null = null;
    let error: unknown = null;

    // First try the payments table
    const paymentsResult = await serverSupabase
      .from('payments')
      .select('id, amount, status, created_at, payment_date')
      .eq('payer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (paymentsResult.error) {
      // If payments table doesn't exist, try payment_tracking
      if (paymentsResult.error.code === 'PGRST205') {
        const trackingResult = await serverSupabase
          .from('payment_tracking')
          .select('id, amount, status, created_at')
          .eq('contractor_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        data = trackingResult.data;
        error = trackingResult.error;
      } else {
        error = paymentsResult.error;
      }
    } else {
      // Map payment_date to due_date for compatibility
      data = (paymentsResult.data || []).map((payment: PaymentData) => ({
        ...payment,
        due_date: payment.payment_date,
      }));
    }

    if (error) {
      logger.error('Error fetching user payments', error, {
        service: 'cache',
        userId,
      });
      return [];
    }

    return data || [];
  },
  ['user-payments'],
  {
    tags: [CACHE_TAGS.USER_PAYMENTS],
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
      .select('id, property_name, address, property_type, is_primary, created_at')
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
 * Cached function to get user subscriptions
 * Note: Subscriptions are for contractors, homeowners don't have subscriptions
 * This returns empty array for homeowners
 */
export const getCachedUserSubscriptions = unstable_cache(
  async (userId: string, limit: number = 20) => {
    // Check if user is a contractor first
    const { data: userData } = await serverSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    // Only fetch subscriptions for contractors
    if (!userData || userData.role !== 'contractor') {
      return [];
    }

    const { data, error } = await serverSupabase
      .from('contractor_subscriptions')
      .select('id, status, current_period_end, amount, created_at')
      .eq('contractor_id', userId)
      .limit(limit);

    if (error) {
      const errorInfo = extractSupabaseError(error);
      logger.error('Error fetching user subscriptions', error, {
        service: 'cache',
        userId,
        code: errorInfo.code || null,
        message: errorInfo.message || null,
      });
      return [];
    }

    // Map current_period_end to next_billing_date for compatibility
    return (data || []).map((sub: SubscriptionData) => ({
      ...sub,
      next_billing_date: sub.current_period_end,
    }));
  },
  ['user-subscriptions'],
  {
    tags: [CACHE_TAGS.USER_SUBSCRIPTIONS],
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
      .select(`
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
        contractor:users!contractor_quotes_contractor_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
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
