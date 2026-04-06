import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { CACHE_TAGS, CACHE_DURATIONS } from './config';
import type { HomeownerData, JobWithPhotos } from './types';

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
            .from('profiles')
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

      // Fetch photos from job_photos_metadata (canonical photo table) for jobs that don't have photos
      try {
        const jobsNeedingPhotos = processedJobs.filter(job => !job.photoUrls || job.photoUrls.length === 0);
        if (jobsNeedingPhotos.length > 0) {
          const jobIds = jobsNeedingPhotos.map(job => job.id);
          const { data: photosData } = await serverSupabase
            .from('job_photos_metadata')
            .select('job_id, photo_url')
            .in('job_id', jobIds)
            .order('created_at', { ascending: true });

          if (photosData && photosData.length > 0) {
            // Group photos by job_id
            const photosByJob: Record<string, string[]> = {};
            photosData.forEach((photo: { job_id: string; photo_url: string }) => {
              if (!photosByJob[photo.job_id]) {
                photosByJob[photo.job_id] = [];
              }
              photosByJob[photo.job_id].push(photo.photo_url);
            });

            // Update jobs with photos from job_photos_metadata table
            processedJobs.forEach((job: JobWithPhotos) => {
              if (photosByJob[job.id]) {
                job.photoUrls = photosByJob[job.id];
              }
            });
          }
        }
        } catch (photosError) {
          // Silently fail - photo metadata fetch is optional
          logger.warn('Could not fetch photos from job_photos_metadata table', {
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
