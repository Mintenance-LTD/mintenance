import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail, JobSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeJobDescription, sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').transform(val => sanitizeText(val, 200)),
  description: z.string().max(5000).optional().transform(val => val ? sanitizeJobDescription(val) : val),
  status: z.string().optional().transform(val => val ? sanitizeText(val, 50) : val),
  category: z.string().max(128).optional().transform(val => val ? sanitizeText(val, 128) : val),
  budget: z.coerce.number().positive().optional(),
  location: z.string().max(256).optional().transform(val => val ? sanitizeText(val, 256) : val),
  photoUrls: z.array(z.string().url()).optional(),
  requiredSkills: z.array(z.string().max(100)).max(10).optional(),
});

// Enriched query with JOINs for complete data
const jobSelectFields = `
  id,
  title,
  description,
  status,
  homeowner_id,
  contractor_id,
  category,
  budget,
  location,
  created_at,
  updated_at,
  homeowner:users!homeowner_id(id,first_name,last_name,email,profile_image_url),
  contractor:users!contractor_id(id,first_name,last_name,email),
  bids(count)
`.replace(/\s+/g, ' ').trim();

type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string | null;
};

type JobAttachment = {
  file_url: string;
  file_type: string;
};

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  homeowner?: UserData;
  contractor?: UserData | null;
  bids?: Array<{ count: number }>;
};

const mapRowToJobSummary = (row: JobRow): JobSummary & {
  homeownerName?: string;
  contractorName?: string;
  category?: string;
  budget?: number;
  location?: string;
  bidCount?: number;
} => ({
  id: row.id,
  title: row.title,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  homeownerName: row.homeowner ? `${row.homeowner.first_name} ${row.homeowner.last_name}` : undefined,
  contractorName: row.contractor ? `${row.contractor.first_name} ${row.contractor.last_name}` : undefined,
  category: row.category ?? undefined,
  budget: row.budget ?? undefined,
  location: row.location ?? undefined,
  bidCount: row.bids?.[0]?.count ?? 0,
});

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: url.searchParams.getAll('status') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { limit, cursor, status } = parsed.data;

    // For contractors viewing available jobs (status=posted), show all posted jobs not yet assigned
    // For homeowners or contractors viewing their own jobs, show jobs they're associated with
    let query = serverSupabase
      .from('jobs')
      .select(jobSelectFields);

    // Check if contractor is requesting available jobs (posted status)
    const isContractorViewingAvailableJobs = user.role === 'contractor' && status?.includes('posted');
    
    if (isContractorViewingAvailableJobs) {
      // Contractors should see all posted jobs that aren't assigned yet
      query = query
        .eq('status', 'posted')
        .is('contractor_id', null);
    } else {
      // Homeowners see their own jobs, contractors see jobs assigned to them
      query = query
        .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);
      
      if (status?.length) {
        query = query.in('status', status);
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error || !data) {
      logger.error('Failed to load jobs', error, {
        service: 'jobs',
        userId: user.id
      });
      return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
    }

    const rows = data as unknown as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore ? limitedRows[limitedRows.length - 1]?.created_at ?? undefined : undefined;

    // Fetch attachments separately for each job (more reliable than nested query)
    const jobIds = limitedRows.map(row => row.id);
    let attachmentsData: { job_id: string; file_url: string; file_type: string }[] | null = null;
    
    if (jobIds.length > 0) {
      const { data } = await serverSupabase
        .from('job_attachments')
        .select('job_id, file_url, file_type')
        .in('job_id', jobIds)
        .eq('file_type', 'image');
      attachmentsData = data;
    }

    // Group attachments by job_id
    const attachmentsByJobId = new Map<string, JobAttachment[]>();
    if (attachmentsData) {
      attachmentsData.forEach((att: { job_id: string; file_url: string; file_type: string }) => {
        if (!attachmentsByJobId.has(att.job_id)) {
          attachmentsByJobId.set(att.job_id, []);
        }
        attachmentsByJobId.get(att.job_id)!.push({
          file_url: att.file_url,
          file_type: att.file_type,
        });
      });
    }

    // Map rows to job summaries with photos
    const items: (JobSummary & { photos?: string[] })[] = limitedRows.map(row => {
      const jobAttachments = attachmentsByJobId.get(row.id) || [];
      const photos = jobAttachments
        .filter(att => att.file_type === 'image')
        .map(att => att.file_url);
      
      return {
        ...mapRowToJobSummary(row),
        photos: photos.length > 0 ? photos : undefined,
      };
    });

    logger.info('Jobs list retrieved', {
      service: 'jobs',
      userId: user.id,
      jobCount: items.length,
      hasMore
    });

    return NextResponse.json({ jobs: items, nextCursor });
  } catch (err) {
    logger.error('Failed to load jobs', err, {
      service: 'jobs'
    });
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      // Convert field errors object to a readable string message
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
      logger.error('Job creation validation failed', {
        service: 'jobs',
        userId: user.id,
        errors: fieldErrors,
      });
      return NextResponse.json({ 
        error: errorMessages || 'Validation failed',
        details: fieldErrors 
      }, { status: 400 });
    }

    const payload = parsed.data;
    const insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
      location?: string | null;
      required_skills?: string[] | null;
    } = {
      title: payload.title.trim(),
      homeowner_id: user.id,
      status: (payload.status ? payload.status.trim() : 'posted'),
    };

    if (typeof payload.description === 'string') {
      insertPayload.description = payload.description.trim();
    }
    if (payload.category !== undefined) {
      insertPayload.category = payload.category?.trim() ?? null;
    }
    if (payload.budget !== undefined) insertPayload.budget = payload.budget;
    if (payload.location !== undefined) {
      insertPayload.location = payload.location?.trim() ?? null;
    }
    // Only include required_skills if provided - column may not exist in all environments
    if (payload.requiredSkills !== undefined && Array.isArray(payload.requiredSkills) && payload.requiredSkills.length > 0) {
      insertPayload.required_skills = payload.requiredSkills;
    }

    let data: any;
    let error: any;
    
    // Try insert with required_skills first
    let result = await serverSupabase
      .from('jobs')
      .insert(insertPayload)
      .select(jobSelectFields)
      .single();
    
    data = result.data;
    error = result.error;

    // If insert fails due to missing required_skills column, retry without it
    if (error && insertPayload.required_skills && (
      error.message?.includes('required_skills') || 
      error.code === '42703' || // undefined_column
      error.message?.includes('column') && error.message?.includes('required_skills')
    )) {
      logger.warn('Required_skills column not found, retrying without it', {
        service: 'jobs',
        userId: user.id,
        originalError: error.message,
      });
      
      // Remove required_skills and retry
      const { required_skills, ...payloadWithoutSkills } = insertPayload;
      result = await serverSupabase
        .from('jobs')
        .insert(payloadWithoutSkills)
        .select(jobSelectFields)
        .single();
      
      data = result.data;
      error = result.error;
      
      if (!error) {
        logger.info('Job created successfully without required_skills column', {
          service: 'jobs',
          userId: user.id,
          jobId: data?.id,
        });
      }
    }

    if (error || !data) {
      logger.error('Failed to create job', error, {
        service: 'jobs',
        userId: user.id,
        errorDetails: error,
        insertPayload,
      });
      const errorMessage = error?.message || 'Failed to create job';
      return NextResponse.json({ 
        error: errorMessage,
        details: error 
      }, { status: 500 });
    }

    const jobRow = data as unknown as JobRow;
    const job = mapRowToJobDetail(jobRow);

    // Save photos to job_attachments if provided
    if (payload.photoUrls && payload.photoUrls.length > 0) {
      try {
        const attachments = payload.photoUrls.map((url: string) => ({
          job_id: job.id,
          file_url: url,
          file_type: 'image',
          uploaded_by: user.id,
        }));

        const { error: attachError } = await serverSupabase
          .from('job_attachments')
          .insert(attachments);

        if (attachError) {
          logger.warn('Failed to save job attachments', {
            service: 'jobs',
            userId: user.id,
            jobId: job.id,
            error: attachError,
          });
          // Don't fail the job creation if attachments fail
        }
      } catch (attachErr) {
        logger.warn('Error saving job attachments', {
          service: 'jobs',
          userId: user.id,
          jobId: job.id,
          error: attachErr,
        });
        // Don't fail the job creation if attachments fail
      }
    }

    logger.info('Job created successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: job.id,
      title: job.title,
      photoCount: payload.photoUrls?.length || 0,
    });

    // Notify nearby contractors about the new job
    if (job.location) {
      try {
        // Geocode the job location to get lat/lng using Google Maps API directly
        let jobLat: number | null = null;
        let jobLng: number | null = null;
        
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          // Handle both string and { lat, lng } formats
          if (typeof job.location === 'string') {
            const encodedAddress = encodeURIComponent(job.location);
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
            
            const geocodeResponse = await fetch(geocodeUrl);
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
              const location = geocodeData.results[0].geometry.location;
              jobLat = location.lat;
              jobLng = location.lng;
            }
          } else if (typeof job.location === 'object' && job.location !== null && 'lat' in job.location && 'lng' in job.location) {
            jobLat = job.location.lat;
            jobLng = job.location.lng;
          }
        }

        // Only proceed if we have coordinates
        if (jobLat && jobLng) {
          // Calculate distance between two points using Haversine formula
          const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371; // Earth's radius in kilometers
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };

          // Fetch all contractors with location data
          const { data: contractors, error: contractorsError } = await serverSupabase
            .from('users')
            .select('id, first_name, last_name, latitude, longitude, is_available')
            .eq('role', 'contractor')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .eq('is_available', true);

          if (!contractorsError && contractors && contractors.length > 0) {
            // Find contractors within 25km radius
            const nearbyContractors = contractors.filter((contractor: any) => {
              const distance = calculateDistance(jobLat!, jobLng!, contractor.latitude, contractor.longitude);
              return distance <= 25; // 25km radius
            });

            // If job has required skills, filter contractors by skills
            let contractorsToNotify = nearbyContractors;
            if (insertPayload.required_skills && insertPayload.required_skills.length > 0) {
              // Get contractor skills
              const contractorIds = nearbyContractors.map((c: any) => c.id);
              const { data: contractorSkills } = await serverSupabase
                .from('contractor_skills')
                .select('contractor_id, skill_name')
                .in('contractor_id', contractorIds);

              // Filter to only contractors with matching skills
              const contractorsWithMatchingSkills = nearbyContractors.filter((contractor: any) => {
                const contractorSkillNames = (contractorSkills || [])
                  .filter((cs: any) => cs.contractor_id === contractor.id)
                  .map((cs: any) => cs.skill_name);
                
                // Check if contractor has at least one matching skill
                return insertPayload.required_skills!.some(skill => contractorSkillNames.includes(skill));
              });

              contractorsToNotify = contractorsWithMatchingSkills.length > 0 
                ? contractorsWithMatchingSkills 
                : nearbyContractors; // If no matches, notify all nearby contractors
            }

            // Create notifications for matching contractors
            if (contractorsToNotify.length > 0) {
              const notifications = contractorsToNotify.map((contractor: any) => {
                const budgetText = insertPayload.budget ? `£${insertPayload.budget.toLocaleString()}` : 'Negotiable';
                const skillsText = insertPayload.required_skills && insertPayload.required_skills.length > 0
                  ? `Requires: ${insertPayload.required_skills.join(', ')}. `
                  : '';
                
                return {
                  user_id: contractor.id,
                  title: 'New Job Near You',
                  message: `New job "${job.title}" posted near you. ${skillsText}Budget: ${budgetText}`,
                  type: 'job_nearby',
                  read: false,
                  action_url: `/jobs/${job.id}`,
                  created_at: new Date().toISOString(),
                };
              });

              const { error: notificationError } = await serverSupabase
                .from('notifications')
                .insert(notifications);

              if (notificationError) {
                console.error('[Job Create] Failed to create job_nearby notifications', {
                  service: 'jobs',
                  jobId: job.id,
                  error: notificationError.message,
                });
              } else {
                console.log('[Job Create] Created job_nearby notifications', {
                  service: 'jobs',
                  jobId: job.id,
                  contractorCount: notifications.length,
                });
              }
            }
          }
        }
      } catch (notifyError) {
        // Don't fail job creation if notification fails
        console.error('[Job Create] Error creating job_nearby notifications', {
          service: 'jobs',
          jobId: job.id,
          error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    logger.error('Failed to create job', err, {
      service: 'jobs'
    });
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
