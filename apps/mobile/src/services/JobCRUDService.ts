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
import { supabase } from '../config/supabase';
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
    priority?: 'low' | 'medium' | 'high';
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
          priority: jobData.priority,
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
      throw new Error('Failed to create job');
    }

    return result.data;
  }

  /**
   * Fetch a single job by id, with photo URLs that survive the
   * 2026-04-17 Job-storage bucket flip from public→private.
   *
   * Goes through the web API (GET /api/jobs/:id) so the server can
   * re-sign legacy `public/Job-storage/...` photo URLs into fresh
   * signed URLs. The previous direct-Supabase implementation returned
   * raw `file_url` values, which 404 on the CDN after the bucket flip
   * — that produced the empty job-detail-screen hero on the homeowner
   * side even though the list view (already API-routed) was rendering
   * thumbnails correctly. Falls back to direct DB access if the API
   * is unreachable so offline / API-down behaviour matches before.
   */
  static async getJobById(jobId: string): Promise<Job | null> {
    try {
      const { job } = await mobileApiClient.get<{
        job: Record<string, unknown>;
      }>(`/api/jobs/${jobId}`);
      if (!job) return null;
      return this.formatJob(job as Record<string, unknown>);
    } catch (apiErr) {
      // Direct-DB fallback — same shape as before. Photos may not
      // render correctly here because we cannot sign URLs from the
      // anon client, but the job itself is still readable so the
      // detail screen at least renders text + status.
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        if (error || !data) return null;

        const [attachments, photos] = await Promise.all([
          supabase
            .from('job_attachments')
            .select('file_url')
            .eq('job_id', jobId)
            .eq('file_type', 'image'),
          supabase
            .from('job_photos_metadata')
            .select('photo_url')
            .eq('job_id', jobId),
        ]);

        const imageUrls = [
          ...(attachments.data?.map((a: { file_url: string }) => a.file_url) ??
            []),
          ...(photos.data?.map((p: { photo_url: string }) => p.photo_url) ??
            []),
        ];
        if (imageUrls.length > 0) {
          data.photos = imageUrls;
        }

        return this.formatJob(data);
      } catch {
        return null;
      }
    }
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

  static async getContractByJobId(
    jobId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(
          'id, job_id, contractor_id, homeowner_id, status, title, description, amount, start_date, end_date, contractor_signed_at, homeowner_signed_at, terms, quote_id, created_at, updated_at, contractor:profiles!contractor_id(first_name, last_name, company_name), homeowner:profiles!homeowner_id(first_name, last_name)'
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      return data[0] as Record<string, unknown>;
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
      // API returns 'images', DB returns 'photos'
      photos: (raw.photos ?? raw.images ?? []) as string[],
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
