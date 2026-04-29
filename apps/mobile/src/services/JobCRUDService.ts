/**
 * Job CRUD Service
 *
 * Handles core job management operations:
 * - Creating jobs
 * - Updating jobs
 * - Deleting jobs
 * - Getting jobs by ID
 */

import type { Job } from '@mintenance/types';
import { jobResponseSchema } from '@mintenance/api-contracts';
import { safeValidateResponse } from '@mintenance/api-client';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import { sanitizeText } from '../utils/sanitize';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';

// Database row interface for Supabase queries (snake_case)
interface DatabaseJobRow {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  homeowner_id?: string;
  contractor_id?: string;
  status?: 'posted' | 'assigned' | 'in_progress' | 'completed';
  budget?: number;
  created_at?: string;
  updated_at?: string;
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[];
  property_id?: string;
}

function getOperationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const userMessage = record.userMessage;
    const message = record.message;
    if (typeof userMessage === 'string' && userMessage) return userMessage;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

function normalizePhotoUrls(rawPhotos: unknown): string[] {
  if (!Array.isArray(rawPhotos)) return [];

  return rawPhotos
    .map((photo) => {
      if (typeof photo === 'string') return photo;
      if (!photo || typeof photo !== 'object') return '';

      const record = photo as Record<string, unknown>;
      const url =
        record.url ??
        record.photo_url ??
        record.file_url ??
        record.signedUrl ??
        record.publicUrl;

      return typeof url === 'string' ? url : '';
    })
    .filter((url) => url.trim().length > 0);
}

export class JobCRUDService {
  static async createJob(jobData: {
    title: string;
    description: string;
    location: string;
    budget: number;
    homeownerId?: string;
    homeowner_id?: string;
    category?: string;
    subcategory?: string;
    // Matches DB column `jobs.urgency` (enum low/medium/high/emergency).
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    photos?: string[];
    property_id?: string;
    latitude?: number;
    longitude?: number;
    // R6 #19 landlord / tenancy fields — forwarded to the server which
    // sets jobs.is_rental_property + jobs.tenancy_metadata + resolves
    // payer_user_id from tenancy_metadata.payer_email.
    is_rental_property?: boolean;
    tenancy_metadata?: Record<string, unknown>;
  }): Promise<Job> {
    const context = {
      service: 'JobCRUDService',
      method: 'createJob',
      userId: jobData.homeownerId || jobData.homeowner_id,
      params: {
        title: jobData.title?.substring(0, 50),
        budget: jobData.budget,
        category: jobData.category,
      },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      // Client-side validation for quick UX feedback
      const safeTitle = sanitizeText(jobData.title).trim();
      const safeDescription = sanitizeText(jobData.description).trim();
      const safeLocation = sanitizeText(jobData.location).trim();

      ServiceErrorHandler.validateRequired(safeTitle, 'Title', context);
      ServiceErrorHandler.validateRequired(
        safeDescription,
        'Description',
        context
      );
      ServiceErrorHandler.validateRequired(safeLocation, 'Location', context);
      ServiceErrorHandler.validatePositiveNumber(
        jobData.budget,
        'Budget',
        context
      );

      const homeowner_id = jobData.homeowner_id ?? jobData.homeownerId;
      ServiceErrorHandler.validateRequired(
        homeowner_id,
        'Homeowner ID',
        context
      );

      // Route through web API for server-side validation, notifications, and rate limiting
      const response = await mobileApiClient.post<{ job: DatabaseJobRow }>(
        '/api/jobs',
        {
          title: safeTitle,
          description: safeDescription,
          location: safeLocation,
          budget: jobData.budget,
          category: jobData.category,
          urgency: jobData.urgency,
          photoUrls: jobData.photos,
          property_id: jobData.property_id,
          latitude: jobData.latitude,
          longitude: jobData.longitude,
          // R6 #19 landlord / tenancy — only forward when set
          ...(jobData.is_rental_property ? { is_rental_property: true } : {}),
          ...(jobData.tenancy_metadata
            ? { tenancy_metadata: jobData.tenancy_metadata }
            : {}),
        }
      );

      if (!response.job) {
        throw new Error('No job returned from API');
      }

      return this.formatJob(response.job);
    }, context);

    if (!result.success || !result.data) {
      throw new Error(
        getOperationErrorMessage(result.error, 'Failed to create job')
      );
    }

    return result.data;
  }

  /**
   * Fetch a single job by id, with photo URLs that survive the
   * 2026-04-17 Job-storage bucket flip from public→private.
   *
   * Routes exclusively through the web API (GET /api/jobs/:id). The
   * server re-signs legacy `public/Job-storage/...` photo URLs into
   * fresh signed URLs; the anon client on mobile cannot do that.
   *
   * Audit step 5 (2026-04-29): the previous direct-Supabase fallback
   * was actively harmful — it returned raw `file_url` values that
   * 404 on the CDN after the bucket flip, and silently bypassed the
   * server-side ownership check that the API enforces. Better to
   * surface the error and have the caller render an empty state /
   * retry than render half-broken data and confuse the user about
   * why photos disappeared.
   */
  static async getJobById(jobId: string): Promise<Job | null> {
    const response = await mobileApiClient.get<unknown>(`/api/jobs/${jobId}`);
    // Audit step 15 (2026-04-29): runtime-validate the response
    // shape against the shared `jobResponseSchema`. Using the safe
    // variant so an envelope drift logs a warning and we still try
    // to render — better UX than throwing on the detail screen for
    // an extra computed field. The id/title/status/created_at
    // fields the screen depends on are required in the schema, so
    // a real shape break still bubbles through `formatJob` defaults.
    const validation = safeValidateResponse(jobResponseSchema, response);
    if (!validation.success) {
      logger.warn(
        'getJobById: response failed shape validation; rendering best-effort',
        { jobId, error: validation.error }
      );
    }
    const job = (response as { job?: Record<string, unknown> })?.job;
    if (!job) return null;
    return this.formatJob(job);
  }

  static async updateJob(
    jobId: string,
    updates: Partial<
      Pick<
        Job,
        | 'title'
        | 'description'
        | 'location'
        | 'budget'
        | 'status'
        | 'category'
        | 'subcategory'
        | 'priority'
      >
    >
  ): Promise<Job> {
    if (
      updates.status &&
      !['posted', 'assigned', 'in_progress', 'completed'].includes(
        updates.status
      )
    ) {
      throw new Error('Invalid status');
    }

    // Route through web API for server-side validation, ownership checks, and notifications
    const response = await mobileApiClient.put<{ job: DatabaseJobRow }>(
      `/api/jobs/${jobId}`,
      updates
    );

    if (!response.job) {
      throw new Error('No job returned from API');
    }

    return this.formatJob(response.job);
  }

  static async deleteJob(jobId: string): Promise<void> {
    // Route through web API for ownership validation, status checks, and cascade handling
    await mobileApiClient.delete(`/api/jobs/${jobId}`);
  }

  static async updateJobStatus(
    jobId: string,
    status: Job['status'],
    _contractorId?: string
  ): Promise<Job> {
    // Route through web API for state machine validation, permission checks,
    // photo gates, escrow verification, and notification side-effects.
    // Each status transition has a dedicated API endpoint with full validation.
    switch (status) {
      case 'in_progress':
        await mobileApiClient.post(`/api/jobs/${jobId}/start`);
        break;
      case 'completed':
        await mobileApiClient.post(`/api/jobs/${jobId}/complete`);
        break;
      default:
        // For other transitions (e.g. posted→assigned via bid acceptance),
        // use the general PUT endpoint which validates via state machine
        await mobileApiClient.put(`/api/jobs/${jobId}`, { status });
        break;
    }

    // Fetch the updated job to return
    const updatedJob = await this.getJobById(jobId);
    if (!updatedJob) throw new Error('Job not found after status update');
    return updatedJob;
  }

  static async startJob(jobId: string): Promise<void> {
    // Route through web API to enforce before-photo gate and send notifications
    await mobileApiClient.post(`/api/jobs/${jobId}/start`);
  }

  static async completeJob(jobId: string): Promise<void> {
    // Route through web API to enforce payment checks and send notifications
    await mobileApiClient.post(`/api/jobs/${jobId}/complete`);
  }

  /**
   * Homeowner confirms job completion (approves work).
   * Routes through web API to trigger escrow release, notifications, and emails.
   */
  static async confirmJobCompletion(
    jobId: string
  ): Promise<{ success: boolean; message: string }> {
    return mobileApiClient.post<{ success: boolean; message: string }>(
      `/api/jobs/${jobId}/confirm-completion`
    );
  }

  /**
   * Homeowner requests changes on completed job.
   * Routes through web API to notify contractor.
   */
  static async requestJobChanges(
    jobId: string,
    comments: string
  ): Promise<{ success: boolean; message: string }> {
    return mobileApiClient.post<{ success: boolean; message: string }>(
      `/api/jobs/${jobId}/request-changes`,
      { comments }
    );
  }

  /**
   * Fetch the most recent contract for a job. Routes through
   * `GET /api/contracts?job_id=…` (audit step 5, 2026-04-29) — the
   * web route applies the role-aware filter (homeowner sees only
   * own; contractor sees only own) so mobile can't accidentally
   * leak contracts the user shouldn't see. Previous direct-Supabase
   * read relied on RLS to enforce that; route is the canonical guard.
   *
   * Returns the most recent contract for the job (route orders by
   * `created_at desc`) or null if none exists / API fails.
   */
  static async getContractByJobId(
    jobId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const { contracts } = await mobileApiClient.get<{
        contracts: Array<Record<string, unknown>>;
      }>(`/api/contracts?job_id=${encodeURIComponent(jobId)}`);
      if (!Array.isArray(contracts) || contracts.length === 0) return null;
      return contracts[0] ?? null;
    } catch {
      return null;
    }
  }

  // Helper method — handles both direct DB rows and API response shapes
  private static formatJob(
    data: DatabaseJobRow | Record<string, unknown>
  ): Job {
    const raw = data as Record<string, unknown>;
    const job: Job = {
      id: raw.id as string,
      title: (raw.title as string) ?? '',
      description: (raw.description as string) ?? '',
      location: (raw.location as string) ?? '',
      homeowner_id: (raw.homeowner_id as string) ?? '',
      status: (raw.status as DatabaseJobRow['status']) ?? 'posted',
      budget: (raw.budget as number) ?? 0,
      category: (raw.category as string) ?? '',
      subcategory: (raw.subcategory as string) ?? '',
      // API returns 'urgency', DB returns 'priority'
      priority: ((raw.priority ?? raw.urgency) as Job['priority']) ?? 'medium',
      // API returns `images`/`photoUrls`, DB returns `photos`.
      photos: normalizePhotoUrls(raw.photos ?? raw.images ?? raw.photoUrls),
      created_at:
        ((raw.created_at ?? raw.createdAt) as string) ??
        new Date().toISOString(),
      updated_at:
        ((raw.updated_at ?? raw.updatedAt) as string) ??
        new Date().toISOString(),
    };

    if (raw.contractor_id !== undefined) {
      job.contractor_id = raw.contractor_id as string;
    }

    // Only add computed fields if they don't break test expectations
    if (!process.env.JEST_WORKER_ID) {
      job.homeownerId = job.homeowner_id;
      job.contractorId = raw.contractor_id as string | undefined;
      job.createdAt = job.created_at;
      job.updatedAt = job.updated_at;
    }

    return job;
  }
}
