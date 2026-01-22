/**
 * Job Service - Business Logic Layer
 * Handles all job-related business operations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
// TODO: Fix import paths for cross-package dependencies
// import { sanitize, SqlProtection } from '@mintenance/security';
import { logger } from '@mintenance/shared';
import { JobRecord, JobSummary, JobDetail, CreateJobData, ListJobsParams } from './types';
import { JobRepository } from './JobRepository';
import { JobValidator } from './JobValidator';
import { User } from '../users';

// Placeholder services - to be implemented in next sprint
import {
  NotificationServiceStub as NotificationService,
  GeocodeServiceStub as GeocodeService,
  AIAssessmentServiceStub as AIAssessmentService,
  AttachmentServiceStub as AttachmentService,
  SqlProtectionStub as SqlProtection
} from './stubs';
export interface JobServiceConfig {
  supabase: SupabaseClient;
  enableAIAssessment?: boolean;
  enableNotifications?: boolean;
  enableGeocoding?: boolean;
}
export class JobService {
  private repository: JobRepository;
  private validator: JobValidator;
  private notificationService?: NotificationService;
  private geocodeService?: GeocodeService;
  private aiAssessmentService?: AIAssessmentService;
  private attachmentService: AttachmentService;
  private config: JobServiceConfig;
  constructor(config: JobServiceConfig) {
    this.config = config;
    this.repository = new JobRepository(config.supabase);
    this.validator = new JobValidator();
    this.attachmentService = new AttachmentService();
    // Optional services
    if (config.enableNotifications) {
      this.notificationService = new NotificationService();
    }
    if (config.enableGeocoding) {
      this.geocodeService = new GeocodeService();
    }
    if (config.enableAIAssessment) {
      this.aiAssessmentService = new AIAssessmentService();
    }
  }
  /**
   * List jobs with filtering and pagination
   */
  async listJobs(params: ListJobsParams): Promise<{
    jobs: JobSummary[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { limit = 20, cursor, status, userId, userRole } = params;
    // Validate parameters
    const validatedParams = this.validator.validateListParams({
      limit,
      cursor,
      status,
    });
    // Build query based on user role
    let query;
    if (userRole === 'contractor' && status?.includes('posted')) {
      // Contractors viewing available jobs
      query = this.repository.getAvailableJobsQuery();
    } else {
      // Users viewing their own jobs
      query = this.repository.getUserJobsQuery(userId, userRole);
    }
    // Apply filters
    if (status?.length) {
      query = this.repository.filterByStatus(query, status);
    }
    // Apply pagination
    if (cursor) {
      query = this.repository.applyCursor(query, cursor);
    }
    // Execute query
    const jobs = await this.repository.executeQuery(query, validatedParams.limit);
    // Fetch additional data (attachments, view counts, AI assessments)
    const enrichedJobs = await this.enrichJobData(jobs.data);
    logger.info('Jobs listed successfully', {
      service: 'JobService',
      userId,
      count: enrichedJobs.length,
      hasMore: jobs.hasMore,
    });
    return {
      jobs: enrichedJobs,
      nextCursor: jobs.nextCursor,
      hasMore: jobs.hasMore,
    };
  }
  /**
   * Create a new job
   */
  async createJob(data: CreateJobData, user: User): Promise<JobDetail> {
    // Validate and sanitize input
    const validatedData = this.validator.validateCreateJobData(data);
    // Check SQL injection
    const sqlCheck = SqlProtection.scanForInjection(
      `${validatedData.title} ${validatedData.description || ''} ${validatedData.location || ''}`
    );
    if (!sqlCheck.isSafe) {
      throw new Error('Invalid input detected');
    }
    // Validate budget constraints
    if (validatedData.budget_min && validatedData.budget_max) {
      if (validatedData.budget_min > validatedData.budget_max) {
        throw new Error('Minimum budget cannot exceed maximum budget');
      }
    }
    // Geocode location if provided
    let coordinates = { lat: validatedData.latitude, lng: validatedData.longitude };
    if (validatedData.location && this.geocodeService && (!coordinates.lat || !coordinates.lng)) {
      try {
        const geocoded = await this.geocodeService.geocodeAddress(validatedData.location);
        if (geocoded) {
          coordinates = geocoded;
        }
      } catch (error) {
        logger.warn('Geocoding failed, continuing without coordinates', { error });
      }
    }
    // Determine if serious buyer (has phone verification or paid subscription)
    const isSeriousBuyer = await this.checkSeriousBuyer(user);
    // Create job in database
    const job = await this.repository.createJob({
      ...validatedData,
      homeowner_id: user.id,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      is_serious_buyer: isSeriousBuyer,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    // Handle photo attachments
    if (validatedData.photoUrls?.length) {
      await this.attachmentService.createAttachments(job.id, validatedData.photoUrls);
    }
    // Run AI assessment if photos provided and service enabled
    if (validatedData.photoUrls?.length && this.aiAssessmentService) {
      try {
        const assessment = await this.aiAssessmentService.assessJob({
          jobId: job.id,
          photoUrls: validatedData.photoUrls
        });
        if (assessment && assessment.id) {
          // Update job with AI assessment
          await this.repository.updateJob(job.id, {
            ai_assessment_id: assessment.id || undefined,
            urgency: assessment.urgency || undefined,
          });
        }
      } catch (error) {
        logger.warn('AI assessment failed, continuing without it', { error });
      }
    }
    // Send notifications to nearby contractors
    if (this.notificationService && coordinates.lat && coordinates.lng) {
      await this.notificationService.notifyNearbyContractors({
        jobId: job.id,
        title: validatedData.title,
        location: validatedData.location,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        budget: validatedData.budget,
        isSeriousBuyer,
      });
    }
    logger.info('Job created successfully', {
      service: 'JobService',
      jobId: job.id,
      userId: user.id,
      hasPhotos: !!validatedData.photoUrls?.length,
      hasAIAssessment: !!job.ai_assessment_id,
    });
    return this.mapToJobDetail(job);
  }
  /**
   * Update an existing job
   */
  async updateJob(jobId: string, data: Partial<CreateJobData>, user: User): Promise<JobDetail> {
    // Check if user owns the job
    const existingJob = await this.repository.getJob(jobId);
    if (!existingJob) {
      throw new Error('Job not found');
    }
    if (existingJob.homeowner_id !== user.id && user.role !== 'admin') {
      throw new Error('Unauthorized to update this job');
    }
    // Validate and sanitize input
    const validatedData = this.validator.validateUpdateJobData(data);
    // Update job
    const updatedJob = await this.repository.updateJob(jobId, {
      ...validatedData,
      updated_at: new Date().toISOString(),
    });
    // Update attachments if provided
    if (data.photoUrls !== undefined) {
      await this.attachmentService.updateAttachments(jobId, data.photoUrls || []);
    }
    logger.info('Job updated successfully', {
      service: 'JobService',
      jobId,
      userId: user.id,
    });
    return this.mapToJobDetail(updatedJob);
  }
  /**
   * Delete a job
   */
  async deleteJob(jobId: string, user: User): Promise<void> {
    // Check if user owns the job
    const existingJob = await this.repository.getJob(jobId);
    if (!existingJob) {
      throw new Error('Job not found');
    }
    if (existingJob.homeowner_id !== user.id && user.role !== 'admin') {
      throw new Error('Unauthorized to delete this job');
    }
    // Check if job can be deleted (no active bids or in progress)
    if (existingJob.status === 'in_progress' || existingJob.status === 'completed') {
      throw new Error('Cannot delete job that is in progress or completed');
    }
    // Delete attachments
    await this.attachmentService.deleteAttachments(jobId);
    // Delete job
    await this.repository.deleteJob(jobId);
    logger.info('Job deleted successfully', {
      service: 'JobService',
      jobId,
      userId: user.id,
    });
  }
  /**
   * Get a single job by ID
   */
  async getJob(jobId: string, user: User): Promise<JobDetail> {
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    // Check if user has access to this job
    const hasAccess =
      job.homeowner_id === user.id ||
      job.contractor_id === user.id ||
      (user.role === 'contractor' && job.status === 'posted') ||
      user.role === 'admin';
    if (!hasAccess) {
      throw new Error('Unauthorized to view this job');
    }
    // Track view if contractor
    if (user.role === 'contractor' && user.id !== job.contractor_id) {
      await this.repository.trackJobView(jobId, user.id);
    }
    // Enrich with additional data
    const enriched = await this.enrichJobData([job]);
    return enriched[0];
  }
  // ============= Private Helper Methods =============
  /**
   * Enrich jobs with additional data
   */
  private async enrichJobData(jobs: any[]): Promise<JobSummary[]> {
    if (!jobs.length) return [];
    const jobIds = jobs.map(j => j.id);
    // Fetch all additional data in parallel
    const [attachments, viewCounts, aiAssessments] = await Promise.all([
      this.attachmentService.getAttachmentsForJobs(jobIds),
      this.repository.getViewCounts(jobIds),
      this.aiAssessmentService?.getAssessmentsForJobs(jobIds) || Promise.resolve(new Map()),
    ]);
    // Map and enrich each job
    return jobs.map(job => {
      const photos = attachments.get(job.id) || [];
      const viewCount = viewCounts.get(job.id) || 0;
      const aiAssessment = aiAssessments.get(job.id);
      return {
        ...this.mapToJobSummary(job),
        photos: photos.length > 0 ? photos : undefined,
        view_count: viewCount > 0 ? viewCount : undefined,
        ai_assessment: aiAssessment,
      };
    });
  }
  /**
   * Check if user is a serious buyer
   */
  private async checkSeriousBuyer(user: User): Promise<boolean> {
    // Check phone verification
    const phoneVerified = await this.repository.isPhoneVerified(user.id);
    if (phoneVerified) return true;
    // Check if user has active subscription
    const hasSubscription = await this.repository.hasActiveSubscription(user.id);
    if (hasSubscription) return true;
    // Check job posting history
    const jobHistory = await this.repository.getJobPostingHistory(user.id);
    if (jobHistory.completedJobs > 0 || jobHistory.paidJobs > 0) return true;
    return false;
  }
  /**
   * Map database row to JobSummary
   */
  private mapToJobSummary(row: any): JobSummary {
    return {
      id: row.id,
      title: row.title,
      status: row.status || 'posted',
      created_at: row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      homeownerName: row.homeowner ? `${row.homeowner.first_name} ${row.homeowner.last_name}` : undefined,
      contractorName: row.contractor ? `${row.contractor.first_name} ${row.contractor.last_name}` : undefined,
      category: row.category,
      budget: row.budget,
      location: row.location,
      bidCount: row.bid_count || 0,
    };
  }
  /**
   * Map database row to JobDetail
   */
  private mapToJobDetail(row: any): JobDetail {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status || 'posted',
      created_at: row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      homeownerId: row.homeowner_id,
      contractorId: row.contractor_id,
      category: row.category,
      budget: row.budget,
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      showBudgetToContractors: row.show_budget_to_contractors,
      requireItemizedBids: row.require_itemized_bids,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      propertyId: row.property_id,
      requiredSkills: row.required_skills,
      isSeriousBuyer: row.is_serious_buyer,
      urgency: row.urgency,
    };
  }
}