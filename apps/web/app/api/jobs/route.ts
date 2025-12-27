import { NextRequest, NextResponse } from 'next/server';
import { validateURLs } from '@/lib/security/url-validation';
import { z } from 'zod';
import type { JobDetail, JobSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeJobDescription, sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { checkJobCreationRateLimit } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError, RateLimitError, ForbiddenError, InternalServerError } from '@/lib/errors/api-error';

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
  budget_min: z.coerce.number().positive().optional(),  // Minimum budget (range)
  budget_max: z.coerce.number().positive().optional(),  // Maximum budget (range)
  show_budget_to_contractors: z.boolean().optional(),  // Whether to show exact budget
  require_itemized_bids: z.boolean().optional(),  // Whether to require itemization
  location: z.string().max(256).optional().transform(val => val ? sanitizeText(val, 256) : val),
  photoUrls: z.array(z.string().url()).optional(),
  requiredSkills: z.array(z.string().max(100)).max(10).optional(),
  property_id: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

// Enriched query with JOINs for complete data including AI assessment
// Note: We use a safe join pattern that won't fail if the foreign key doesn't exist yet
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
  latitude,
  longitude,
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

type AIAssessmentData = {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  assessment_data?: any;
  created_at: string;
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
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
  homeowner?: UserData;
  contractor?: UserData | null;
  bids?: Array<{ count: number }>;
  building_assessments?: AIAssessmentData[] | null;
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
      throw new UnauthorizedError('Authentication required to view jobs');
    }

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: url.searchParams.getAll('status') ?? undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError('Invalid query parameters');
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

    const { data: jobsData, error } = await query;
    if (error || !jobsData) {
      logger.error('Failed to load jobs', error, {
        service: 'jobs',
        userId: user.id
      });
      throw error || new Error('Failed to load jobs');
    }

    const rows = jobsData as unknown as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore ? limitedRows[limitedRows.length - 1]?.created_at ?? undefined : undefined;

    // Fetch attachments and view counts separately for each job (more reliable than nested query)
    const jobIds = limitedRows.map(row => row.id);
    let attachmentsData: { job_id: string; file_url: string; file_type: string }[] | null = null;
    let viewCountsData: { job_id: string; count: number }[] | null = null;
    
    if (jobIds.length > 0) {
      const [attachmentsResult, viewCountsResult] = await Promise.all([
        serverSupabase
          .from('job_attachments')
          .select('job_id, file_url, file_type')
          .in('job_id', jobIds)
          .eq('file_type', 'image'),
        // Get view counts (count of unique contractors who viewed each job)
        serverSupabase
          .from('job_views')
          .select('job_id')
          .in('job_id', jobIds)
      ]);
      
      attachmentsData = attachmentsResult.data;
      
      // Count views per job
      if (viewCountsResult.data) {
        const viewCountsMap = new Map<string, number>();
        viewCountsResult.data.forEach((view: { job_id: string }) => {
          viewCountsMap.set(view.job_id, (viewCountsMap.get(view.job_id) || 0) + 1);
        });
        viewCountsData = Array.from(viewCountsMap.entries()).map(([job_id, count]) => ({ job_id, count }));
      }
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

    // Create view counts map
    const viewCountsByJobId = new Map<string, number>();
    if (viewCountsData) {
      viewCountsData.forEach((vc: { job_id: string; count: number }) => {
        viewCountsByJobId.set(vc.job_id, vc.count);
      });
    }

    // Try to fetch building assessments (will silently fail if job_id column doesn't exist yet)
    let assessmentsByJobId = new Map<string, AIAssessmentData>();
    if (jobIds.length > 0) {
      try {
        // Check if job_id column exists first
        const { data: columnCheck } = await serverSupabase
          .from('building_assessments')
          .select('job_id')
          .limit(0); // Just check the column existence

        if (columnCheck !== null) {
          // Column exists, fetch assessments
          const { data: assessmentsData } = await serverSupabase
            .from('building_assessments')
            .select('id, job_id, severity, damage_type, confidence, urgency, assessment_data, created_at')
            .in('job_id', jobIds)
            .order('created_at', { ascending: false });

          if (assessmentsData) {
            // Group by job_id and take the most recent
            assessmentsData.forEach((assessment: any) => {
              if (assessment.job_id && !assessmentsByJobId.has(assessment.job_id)) {
                assessmentsByJobId.set(assessment.job_id, {
                  id: assessment.id,
                  severity: assessment.severity,
                  damage_type: assessment.damage_type,
                  confidence: assessment.confidence,
                  urgency: assessment.urgency,
                  assessment_data: assessment.assessment_data,
                  created_at: assessment.created_at,
                });
              }
            });
          }
        }
      } catch (error) {
        // Silently ignore if the column doesn't exist yet
        logger.debug('Building assessments not available (migration may be pending)', { error });
      }
    }

    // Map rows to job summaries with photos, view counts, and AI assessments
    const items: (JobSummary & { photos?: string[]; view_count?: number; ai_assessment?: AIAssessmentData | null })[] = limitedRows.map(row => {
      const jobAttachments = attachmentsByJobId.get(row.id) || [];
      const photos = jobAttachments
        .filter(att => att.file_type === 'image')
        .map(att => att.file_url);
      const viewCount = viewCountsByJobId.get(row.id) || 0;
      const jobSummary = mapRowToJobSummary(row);
      const aiAssessment = assessmentsByJobId.get(row.id) || null;

      return {
        ...jobSummary,
        photos: photos.length > 0 ? photos : undefined,
        view_count: viewCount > 0 ? viewCount : undefined,
        ai_assessment: aiAssessment,
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
    return handleAPIError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to create jobs');
    }

    // Rate limiting: 10 jobs per hour per user (TEMPORARILY DISABLED FOR TESTING)
    const skipRateLimit = process.env.NODE_ENV === 'development' || process.env.SKIP_RATE_LIMIT === 'true';

    if (!skipRateLimit) {
      const rateLimitResult = await checkJobCreationRateLimit(user.id);

      if (!rateLimitResult.allowed) {
        logger.warn('Job creation rate limit exceeded', {
          service: 'jobs',
          userId: user.id,
          remaining: rateLimitResult.remaining,
          retryAfter: rateLimitResult.retryAfter,
        });

        throw new RateLimitError('Too many job creation requests. Please try again later.');
      }
    }

    // Check phone verification for homeowners (TEMPORARILY DISABLED FOR TESTING)
    // TODO: Re-enable phone verification after testing
    const skipVerification = process.env.NODE_ENV === 'development' || process.env.SKIP_PHONE_VERIFICATION === 'true';

    if (user.role === 'homeowner' && !skipVerification) {
      const { HomeownerVerificationService } = await import('@/lib/services/verification/HomeownerVerificationService');
      const verificationStatus = await HomeownerVerificationService.isFullyVerified(user.id);

      if (!verificationStatus.canPostJobs) {
        throw new ForbiddenError('Phone verification required. Please verify your phone number before posting jobs');
      }
    }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      logger.error('Job creation validation failed', {
        service: 'jobs',
        userId: user.id,
        errors: fieldErrors,
      });
      throw new BadRequestError('Validation failed');
    }

    const payload = parsed.data;

    // BUSINESS RULE: Jobs over £500 MUST have images
    if (payload.budget && payload.budget > 500) {
      const hasImages = payload.photoUrls && payload.photoUrls.length > 0;

      if (!hasImages) {
        logger.warn('Job creation rejected: Budget >£500 requires images', {
          service: 'jobs',
          userId: user.id,
          budget: payload.budget,
          photoCount: 0,
        });
        throw new BadRequestError('Jobs with a budget over £500 must include at least one photo');
      }
    }

    // SECURITY: Validate photo URLs to prevent SSRF attacks
    if (payload.photoUrls && payload.photoUrls.length > 0) {
      const urlValidation = await validateURLs(payload.photoUrls, true);
      if (urlValidation.invalid.length > 0) {
        logger.warn('Invalid photo URLs rejected in job creation', {
          service: 'jobs',
          userId: user.id,
          invalidUrls: urlValidation.invalid,
        });
        throw new BadRequestError(`Invalid photo URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}`);
      }
      // Replace with validated URLs
      payload.photoUrls = urlValidation.valid;
    }

    const insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
      location?: string | null;
      required_skills?: string[] | null;
      property_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
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

    // Budget visibility and itemization fields
    if (payload.budget_min !== undefined) {
      insertPayload.budget_min = payload.budget_min;
    }
    if (payload.budget_max !== undefined) {
      insertPayload.budget_max = payload.budget_max;
    }
    if (payload.show_budget_to_contractors !== undefined) {
      insertPayload.show_budget_to_contractors = payload.show_budget_to_contractors;
    }
    if (payload.require_itemized_bids !== undefined) {
      insertPayload.require_itemized_bids = payload.require_itemized_bids;
    } else if (payload.budget && payload.budget > 500) {
      // Auto-require itemization for high-value jobs (>£500)
      insertPayload.require_itemized_bids = true;
    }

    if (payload.location !== undefined) {
      insertPayload.location = payload.location?.trim() ?? null;
    }
    // Only include required_skills if provided - column may not exist in all environments
    if (payload.requiredSkills !== undefined && Array.isArray(payload.requiredSkills) && payload.requiredSkills.length > 0) {
      insertPayload.required_skills = payload.requiredSkills;
    }
    // Include property_id if provided
    if (payload.property_id !== undefined) {
      insertPayload.property_id = payload.property_id;
    }
    // Include latitude and longitude if provided (from frontend geocoding)
    if (payload.latitude !== undefined && payload.latitude !== null) {
      insertPayload.latitude = payload.latitude;
    }
    if (payload.longitude !== undefined && payload.longitude !== null) {
      insertPayload.longitude = payload.longitude;
    }

    let data: unknown;
    let error: unknown;
    
    // Try insert with required_skills first
    let result = await serverSupabase
      .from('jobs')
      .insert(insertPayload)
      .select(jobSelectFields)
      .single();
    
    data = result.data;
    error = result.error;

    // If insert fails due to missing required_skills column, retry without it
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String(error.message) 
      : '';
    const errorCode = error && typeof error === 'object' && 'code' in error 
      ? String(error.code) 
      : '';
    
    if (error && insertPayload.required_skills && (
      errorMessage.includes('required_skills') || 
      errorCode === '42703' || // undefined_column
      (errorMessage.includes('column') && errorMessage.includes('required_skills'))
    )) {
      logger.warn('Required_skills column not found, retrying without it', {
        service: 'jobs',
        userId: user.id,
        originalError: errorMessage,
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
        const jobId = data && typeof data === 'object' && 'id' in data 
          ? String(data.id) 
          : undefined;
        logger.info('Job created successfully without required_skills column', {
          service: 'jobs',
          userId: user.id,
          jobId,
        });
      }
    }

    if (error || !data) {
      logger.error('Failed to create job', error, {
        service: 'jobs',
        userId: user.id,
        errorDetails: error,
      });
      throw new InternalServerError('Failed to create job');
    }

    // Calculate and update serious buyer score
    try {
      const jobId = data && typeof data === 'object' && 'id' in data 
        ? String(data.id) 
        : null;
      
      if (!jobId) {
        logger.warn('Cannot calculate serious buyer score: job ID not found', {
          service: 'jobs',
          userId: user.id,
        });
      } else {
        const { SeriousBuyerService } = await import('@/lib/services/jobs/SeriousBuyerService');
        const photoUrls = payload.photoUrls || [];
        await SeriousBuyerService.updateScore(jobId, user.id, {
          description: payload.description,
          budget: payload.budget,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        });
      }
    } catch (scoreError) {
      // Log but don't fail job creation
      const jobId = data && typeof data === 'object' && 'id' in data 
        ? String(data.id) 
        : undefined;
      logger.error('Failed to calculate serious buyer score', scoreError, {
        service: 'jobs',
        jobId,
      });
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
        // Check if coordinates were already saved from the request body
        const jobRow = data as unknown as JobRow;
        const hasCoordinates = jobRow.latitude && jobRow.longitude;
        
        let jobLat: number | null = jobRow.latitude || null;
        let jobLng: number | null = jobRow.longitude || null;
        
        // Only geocode if coordinates weren't provided in the request
        if (!hasCoordinates) {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            // Handle both string and { lat, lng } formats
            if (typeof job.location === 'string') {
              try {
                // Use timeout wrapper to prevent hanging geocoding requests
                const { geocodeWithTimeout } = await import('@/lib/utils/api-timeout');
                const geocodeResult = await geocodeWithTimeout(job.location, apiKey, 5000);

                jobLat = geocodeResult.latitude;
                jobLng = geocodeResult.longitude;
              } catch (geocodeError) {
                logger.warn('Geocoding failed or timed out, continuing without coordinates', {
                  service: 'jobs',
                  error: geocodeError,
                  location: job.location,
                });
                // Continue without coordinates - not a critical failure
              }
            } else if (typeof job.location === 'object' && job.location !== null && 'lat' in job.location && 'lng' in job.location) {
              jobLat = job.location.lat;
              jobLng = job.location.lng;
            }
            
            // Save the coordinates to the job record if we geocoded them
            if (jobLat && jobLng) {
              await serverSupabase
                .from('jobs')
                .update({
                  latitude: jobLat,
                  longitude: jobLng,
                })
                .eq('id', job.id);

              logger.info('Updated job with geocoding data', {
                service: 'jobs',
                jobId: job.id,
                lat: jobLat,
                lng: jobLng,
              });
            }
          }
        } else {
          logger.info('Job already has coordinates from request body', {
            service: 'jobs',
            jobId: job.id,
            lat: jobLat,
            lng: jobLng,
          });
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
            interface ContractorRecord {
              id: string;
              latitude?: number;
              longitude?: number;
              [key: string]: unknown;
            }

            const nearbyContractors = contractors.filter((contractor: ContractorRecord) => {
              const lat = typeof contractor.latitude === 'number' ? contractor.latitude : undefined;
              const lng = typeof contractor.longitude === 'number' ? contractor.longitude : undefined;
              if (lat === undefined || lng === undefined || jobLat === undefined || jobLng === undefined) {
                return false;
              }
              const distance = calculateDistance(jobLat, jobLng, lat, lng);
              return distance <= 25; // 25km radius
            });

            // If job has required skills, filter contractors by skills
            let contractorsToNotify = nearbyContractors;
            if (insertPayload.required_skills && insertPayload.required_skills.length > 0) {
              // Get contractor skills
              const contractorIds = nearbyContractors.map((c: ContractorRecord) => c.id);
              const { data: contractorSkills } = await serverSupabase
                .from('contractor_skills')
                .select('contractor_id, skill_name')
                .in('contractor_id', contractorIds);

              interface ContractorSkillRecord {
                contractor_id: string;
                skill_name: string;
              }

              // Filter to only contractors with matching skills
              const contractorsWithMatchingSkills = nearbyContractors.filter((contractor: ContractorRecord) => {
                const contractorSkillNames = (contractorSkills || [])
                  .filter((cs: ContractorSkillRecord) => cs.contractor_id === contractor.id)
                  .map((cs: ContractorSkillRecord) => cs.skill_name);
                
                // Check if contractor has at least one matching skill
                return insertPayload.required_skills!.some(skill => contractorSkillNames.includes(skill));
              });

              contractorsToNotify = contractorsWithMatchingSkills.length > 0 
                ? contractorsWithMatchingSkills 
                : nearbyContractors; // If no matches, notify all nearby contractors
            }

            // Create notifications for matching contractors
            if (contractorsToNotify.length > 0) {
              const notifications = contractorsToNotify.map((contractor: ContractorRecord) => {
                // Budget display logic: show range if budget hidden, otherwise exact amount
                let budgetText: string;
                if (!insertPayload.show_budget_to_contractors && insertPayload.budget_min && insertPayload.budget_max) {
                  budgetText = `£${insertPayload.budget_min.toLocaleString()}-£${insertPayload.budget_max.toLocaleString()}`;
                } else if (insertPayload.budget) {
                  budgetText = `£${insertPayload.budget.toLocaleString()}`;
                } else {
                  budgetText = 'Negotiable';
                }

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
                logger.error('Failed to create job_nearby notifications', notificationError, {
                  service: 'jobs',
                  jobId: job.id,
                });
              } else {
                logger.info('Created job_nearby notifications', {
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
        logger.error('Error creating job_nearby notifications', notifyError, {
          service: 'jobs',
          jobId: job.id,
        });
      }
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return handleAPIError(err);
  }
}
