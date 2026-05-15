import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateURLs } from '@/lib/security/url-validation';
import { logger, BUSINESS_RULES } from '@mintenance/shared';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import type { JobDetail, JobSummary, User } from '@mintenance/types';
import { JobNotificationService } from './job-notification-service';

interface JobCreationPayload {
  title: string;
  description?: string;
  status?: string;
  category?: string | null;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  show_budget_to_contractors?: boolean;
  require_itemized_bids?: boolean;
  location?: string | null;
  photoUrls?: string[];
  requiredSkills?: string[];
  property_id?: string;
  urgency?: string;
  latitude?: number;
  longitude?: number;
  // R6 #19 landlord / tenancy fields
  is_rental_property?: boolean;
  payer_user_id?: string;
  tenancy_metadata?: Record<string, unknown>;
  // Silver-mode + future per-job flags. Persists to jobs.requirements
  // (jsonb). Live audit (2026-04-28) confirmed the column has 16 prod
  // rows already, so it's the right destination — the path was just
  // missing from the API contract.
  requirements?: Record<string, unknown>;
  // 2026-05-13 (Hire-Again loop closure): when set, the create flow
  // fires an extra "invited bid" notification to this contractor on
  // top of the standard nearby broadcast. Not persisted on the job.
  preferred_contractor_id?: string;
}

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

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
  updated_at
`
  .replace(/\s+/g, ' ')
  .trim();

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class JobCreationService {
  private static instance: JobCreationService;
  private notificationService = JobNotificationService.getInstance();

  private constructor() {}

  static getInstance(): JobCreationService {
    if (!JobCreationService.instance) {
      JobCreationService.instance = new JobCreationService();
    }
    return JobCreationService.instance;
  }

  async createJob(
    user: Pick<User, 'id' | 'role'>,
    payload: JobCreationPayload
  ): Promise<JobDetail> {
    this.enforceBudgetPhotoRule(user.id, payload);
    await this.validatePhotoUrls(user.id, payload);
    await this.validatePropertyOwnership(user.id, payload);
    await this.resolvePayerFromEmail(payload);

    const insertPayload = this.buildInsertPayload(user, payload);

    // Server-side geocoding: if location text provided but no coordinates,
    // geocode the address so the job appears at the correct map position
    if (
      insertPayload.location &&
      !insertPayload.latitude &&
      !insertPayload.longitude
    ) {
      try {
        const coords = await this.geocodeAddress(insertPayload.location);
        if (coords) {
          insertPayload.latitude = coords.latitude;
          insertPayload.longitude = coords.longitude;
        }
      } catch (geoError) {
        // Non-fatal: job is still created, just without coordinates
        logger.warn('Failed to geocode job location', {
          service: 'job-creation',
          location: insertPayload.location,
          error:
            geoError instanceof Error ? geoError.message : String(geoError),
        });
      }
    }

    const jobRow = await this.insertJob(user.id, insertPayload);

    await this.updateSeriousBuyerScore(user.id, jobRow.id, payload);
    await this.saveAttachments(user.id, jobRow.id, payload.photoUrls);

    await this.notificationService.notifyNearbyContractors(
      {
        id: jobRow.id,
        title: jobRow.title,
        location: jobRow.location ?? null,
        latitude: jobRow.latitude ?? null,
        longitude: jobRow.longitude ?? null,
      },
      {
        required_skills: insertPayload.required_skills,
        show_budget_to_contractors: insertPayload.show_budget_to_contractors,
        budget: insertPayload.budget,
        budget_min: insertPayload.budget_min,
        budget_max: insertPayload.budget_max,
      }
    );

    // Hire-Again loop closure (2026-05-13): fire a direct, higher-priority
    // notification to the previously-hired contractor. The broadcast above
    // already covered them (assuming they're in range / skill-matched), but
    // this is the "first-look" signal the HireAgainBanner promises ("They'll
    // be notified first"). Fire-and-forget — never blocks the job creation.
    if (payload.preferred_contractor_id) {
      this.notificationService
        .notifyPreferredContractor(
          payload.preferred_contractor_id,
          jobRow.id,
          jobRow.title,
          user.id
        )
        .catch((err: unknown) => {
          logger.warn('Preferred-contractor notification failed', {
            service: 'job-creation',
            jobId: jobRow.id,
            preferredContractorId: payload.preferred_contractor_id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return mapRowToJobDetail(jobRow);
  }

  private enforceBudgetPhotoRule(
    userId: string,
    payload: JobCreationPayload
  ): void {
    const budgetThreshold = BUSINESS_RULES.BUDGET_REQUIRES_PHOTOS_THRESHOLD;
    if (payload.budget && payload.budget > budgetThreshold) {
      const hasImages = payload.photoUrls && payload.photoUrls.length > 0;
      if (!hasImages) {
        logger.warn(
          `Job creation rejected: Budget >£${budgetThreshold} requires images`,
          {
            service: 'jobs',
            userId,
            budget: payload.budget,
            photoCount: 0,
          }
        );
        throw new BadRequestError(
          `Jobs with a budget over £${budgetThreshold} must include at least one photo`
        );
      }
    }
  }

  private async validatePhotoUrls(
    userId: string,
    payload: JobCreationPayload
  ): Promise<void> {
    if (!payload.photoUrls || payload.photoUrls.length === 0) {
      return;
    }

    const urlValidation = await validateURLs(payload.photoUrls, true);
    if (urlValidation.invalid.length > 0) {
      logger.warn('Invalid photo URLs rejected in job creation', {
        service: 'jobs',
        userId,
        invalidUrls: urlValidation.invalid,
      });
      throw new BadRequestError(
        `Invalid photo URLs: ${urlValidation.invalid.map((i: { error: string }) => i.error).join(', ')}`
      );
    }

    payload.photoUrls = urlValidation.valid;
  }

  /**
   * R6 #19: when the client passes tenancy_metadata.payer_email (landlord
   * flow), resolve that email to a profiles.id and set payload.payer_user_id.
   * If no matching profile exists, we leave payer_user_id NULL — the
   * poster will still be allowed to fund escrow, and the metadata row
   * records the intended payer email for an outreach flow.
   */
  private async resolvePayerFromEmail(
    payload: JobCreationPayload
  ): Promise<void> {
    if (payload.payer_user_id) return;
    const meta = payload.tenancy_metadata;
    const email =
      meta && typeof meta === 'object' && typeof meta.payer_email === 'string'
        ? meta.payer_email
        : null;
    if (!email) return;

    // Audit P2 (2026-04-23): the previous `.ilike('email', email...)`
    // was case-insensitive but interpreted `%`/`_` in the input as
    // LIKE wildcards. A homeowner setting `tenancy_metadata.payer_email
    // = '%@gmail.com'` could enumerate Gmail-using profiles via the
    // returned id. `.eq()` removes the wildcard interpretation
    // entirely. Live DB scan (2026-04-25) confirmed 10/10 profiles
    // have lowercase emails, so case-insensitivity is no longer
    // required — emails are normalized at insert time elsewhere.
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (profile?.id) {
      payload.payer_user_id = profile.id as string;
    }
  }

  private async validatePropertyOwnership(
    userId: string,
    payload: JobCreationPayload
  ): Promise<void> {
    if (!payload.property_id) return;

    const { data: property, error } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', payload.property_id)
      .single();

    if (error || !property) {
      throw new BadRequestError('Property not found');
    }

    if (property.owner_id !== userId) {
      logger.warn('User attempted to create job for property they do not own', {
        service: 'jobs',
        userId,
        propertyId: payload.property_id,
        ownerId: property.owner_id,
      });
      throw new ForbiddenError('You do not own this property');
    }
  }

  private buildInsertPayload(
    user: Pick<User, 'id'>,
    payload: JobCreationPayload
  ): {
    title: string;
    homeowner_id: string;
    status: string;
    description?: string;
    category?: string | null;
    urgency?: string | null;
    budget?: number;
    budget_min?: number;
    budget_max?: number;
    show_budget_to_contractors?: boolean;
    require_itemized_bids?: boolean;
    location?: string | null;
    required_skills?: string[] | null;
    property_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    is_rental_property?: boolean;
    payer_user_id?: string | null;
    tenancy_metadata?: Record<string, unknown>;
    requirements?: Record<string, unknown>;
  } {
    const budgetThreshold = BUSINESS_RULES.BUDGET_REQUIRES_PHOTOS_THRESHOLD;
    const insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      urgency?: string | null;
      budget?: number;
      budget_min?: number;
      budget_max?: number;
      show_budget_to_contractors?: boolean;
      require_itemized_bids?: boolean;
      location?: string | null;
      required_skills?: string[] | null;
      property_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      is_rental_property?: boolean;
      payer_user_id?: string | null;
      tenancy_metadata?: Record<string, unknown>;
      requirements?: Record<string, unknown>;
    } = {
      title: payload.title.trim(),
      homeowner_id: user.id,
      status: payload.status ? payload.status.trim() : 'posted',
    };

    if (typeof payload.description === 'string') {
      insertPayload.description = payload.description.trim();
    }
    if (payload.category !== undefined) {
      insertPayload.category = payload.category?.trim() ?? null;
    }
    if (payload.urgency !== undefined) {
      insertPayload.urgency = payload.urgency;
    }
    if (payload.budget !== undefined) insertPayload.budget = payload.budget;
    if (payload.budget_min !== undefined)
      insertPayload.budget_min = payload.budget_min;
    if (payload.budget_max !== undefined)
      insertPayload.budget_max = payload.budget_max;
    if (payload.show_budget_to_contractors !== undefined) {
      insertPayload.show_budget_to_contractors =
        payload.show_budget_to_contractors;
    }
    if (payload.require_itemized_bids !== undefined) {
      insertPayload.require_itemized_bids = payload.require_itemized_bids;
    } else if (payload.budget && payload.budget > budgetThreshold) {
      insertPayload.require_itemized_bids = true;
    }
    if (payload.location !== undefined) {
      insertPayload.location = payload.location?.trim() ?? null;
    }
    if (
      payload.requiredSkills !== undefined &&
      Array.isArray(payload.requiredSkills) &&
      payload.requiredSkills.length > 0
    ) {
      insertPayload.required_skills = payload.requiredSkills;
    }
    if (payload.property_id !== undefined) {
      insertPayload.property_id = payload.property_id;
    }
    if (payload.latitude !== undefined && payload.latitude !== null) {
      insertPayload.latitude = payload.latitude;
    }
    if (payload.longitude !== undefined && payload.longitude !== null) {
      insertPayload.longitude = payload.longitude;
    }
    // R6 #19 landlord / tenancy flags.
    if (payload.is_rental_property !== undefined) {
      insertPayload.is_rental_property = payload.is_rental_property;
    }
    if (payload.payer_user_id) {
      insertPayload.payer_user_id = payload.payer_user_id;
    }
    if (
      payload.tenancy_metadata &&
      typeof payload.tenancy_metadata === 'object'
    ) {
      insertPayload.tenancy_metadata = payload.tenancy_metadata;
    }
    // Per-job requirement flags (silver-mode contractor_before_photos +
    // future per-job toggles). Persists to jobs.requirements jsonb.
    if (
      payload.requirements &&
      typeof payload.requirements === 'object' &&
      !Array.isArray(payload.requirements) &&
      Object.keys(payload.requirements).length > 0
    ) {
      insertPayload.requirements = payload.requirements;
    }

    return insertPayload;
  }

  private async insertJob(
    userId: string,
    insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
      budget_min?: number;
      budget_max?: number;
      show_budget_to_contractors?: boolean;
      require_itemized_bids?: boolean;
      location?: string | null;
      required_skills?: string[] | null;
      property_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      is_rental_property?: boolean;
      payer_user_id?: string | null;
      tenancy_metadata?: Record<string, unknown>;
      requirements?: Record<string, unknown>;
    }
  ): Promise<JobRow> {
    let result = await serverSupabase
      .from('jobs')
      .insert(insertPayload)
      .select(jobSelectFields)
      .single();

    let data = result.data;
    let error = result.error;

    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';

    if (
      error &&
      insertPayload.required_skills &&
      (errorMessage.includes('required_skills') ||
        errorCode === '42703' ||
        (errorMessage.includes('column') &&
          errorMessage.includes('required_skills')))
    ) {
      logger.warn('Required_skills column not found, retrying without it', {
        service: 'jobs',
        userId,
        originalError: errorMessage,
      });

      const { required_skills, ...payloadWithoutSkills } = insertPayload;
      result = await serverSupabase
        .from('jobs')
        .insert(payloadWithoutSkills)
        .select(jobSelectFields)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      logger.error('Failed to create job', error, {
        service: 'jobs',
        userId,
        errorDetails: error,
      });
      throw new InternalServerError('Failed to create job');
    }

    return data as unknown as JobRow;
  }

  private async updateSeriousBuyerScore(
    userId: string,
    jobId: string,
    payload: JobCreationPayload
  ): Promise<void> {
    try {
      const { SeriousBuyerService } =
        await import('@/lib/services/jobs/SeriousBuyerService');
      const photoUrls = payload.photoUrls || [];
      await SeriousBuyerService.updateScore(jobId, userId, {
        description: payload.description,
        budget: payload.budget,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });
    } catch (scoreError) {
      logger.error('Failed to calculate serious buyer score', scoreError, {
        service: 'jobs',
        jobId,
      });
    }
  }

  private async saveAttachments(
    userId: string,
    jobId: string,
    photoUrls?: string[]
  ): Promise<void> {
    if (!photoUrls || photoUrls.length === 0) {
      return;
    }

    try {
      const attachments = photoUrls.map((url: string) => ({
        job_id: jobId,
        file_url: url,
        file_type: 'image',
        uploaded_by: userId,
      }));

      const { error } = await serverSupabase
        .from('job_attachments')
        .insert(attachments);

      if (error) {
        logger.warn('Failed to save job attachments', {
          service: 'jobs',
          userId,
          jobId,
          error,
        });
      }
    } catch (attachErr) {
      logger.warn('Error saving job attachments', {
        service: 'jobs',
        userId,
        jobId,
        error: attachErr,
      });
    }
  }

  /**
   * Geocode a location string to lat/lng using Google Maps API.
   * Returns null if geocoding fails or API key is not configured.
   */
  private async geocodeAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured — skipping geocoding', {
        service: 'job-creation',
      });
      return null;
    }

    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      logger.info('Job location geocoded', {
        service: 'job-creation',
        address,
        lat,
        lng,
      });
      return { latitude: lat, longitude: lng };
    }

    logger.warn('Geocoding returned no results', {
      service: 'job-creation',
      address,
      status: data.status,
    });
    return null;
  }
}
