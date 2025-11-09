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
        console.error('Error fetching jobs:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      // Fetch homeowner data separately to avoid relation issues
      const homeownerIds = [...new Set((jobs || []).map(job => job.homeowner_id).filter(Boolean))];
      const homeownersMap: Record<string, any> = {};
      
      if (homeownerIds.length > 0) {
        try {
          const { data: homeowners } = await serverSupabase
            .from('users')
            .select('id, first_name, last_name, city, profile_image_url')
            .in('id', homeownerIds);
          
          if (homeowners) {
            homeowners.forEach((homeowner: any) => {
              homeownersMap[homeowner.id] = homeowner;
            });
          }
        } catch (homeownerError) {
          console.warn('Could not fetch homeowner data:', homeownerError);
        }
      }

      // Process jobs to normalize photos array
      const processedJobs = (jobs || []).map(job => {
        let photoUrls: string[] = [];
        
        // Try to get photos from photos JSONB field
        if (job.photos) {
          if (Array.isArray(job.photos)) {
            photoUrls = job.photos.filter((url: any) => url && typeof url === 'string');
          } else if (typeof job.photos === 'string') {
            try {
              const parsed = JSON.parse(job.photos);
              if (Array.isArray(parsed)) {
                photoUrls = parsed.filter((url: any) => url && typeof url === 'string');
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
          latitude: (job as any).latitude || null,
          longitude: (job as any).longitude || null,
          timeline: (job as any).timeline || null,
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
            photosData.forEach((photo: any) => {
              if (!photosByJob[photo.job_id]) {
                photosByJob[photo.job_id] = [];
              }
              photosByJob[photo.job_id].push(photo.photo_url);
            });

            // Update jobs with photos from jobs_photos table
            processedJobs.forEach(job => {
              if (photosByJob[job.id]) {
                job.photoUrls = photosByJob[job.id];
              }
            });
          }
        }
      } catch (photosError) {
        // Silently fail - photos from jobs_photos table are optional
        console.warn('Could not fetch photos from jobs_photos table:', photosError);
      }

      return processedJobs;
    } catch (err) {
      console.error('Unexpected error in getCachedJobs:', err);
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
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.CONTRACTORS);
  } catch (error) {
    console.error('Error revalidating contractors:', error);
  }
}

export async function revalidateJobs() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.JOBS);
  } catch (error) {
    console.error('Error revalidating jobs:', error);
  }
}

export async function revalidateServiceCategories() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.CATEGORIES);
  } catch (error) {
    console.error('Error revalidating categories:', error);
  }
}

export async function revalidateUserProfile(userId: string) {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as any)(CACHE_TAGS.USER_PROFILES);
  } catch (error) {
    console.error('Error revalidating user profile:', error);
  }
}
