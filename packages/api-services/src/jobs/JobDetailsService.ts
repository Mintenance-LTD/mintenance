/**
 * Job Details Service - Business logic for single job operations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { JobRepository } from './JobRepository';
import { JobDetailsValidator } from './JobDetailsValidator';
import crypto from 'crypto';
// Temporary types
interface User {
  id: string;
  email: string;
  role: string;
}
interface JobDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  homeowner?: unknown;
  contractor?: unknown;
  property?: unknown;
  bids?: unknown;
  attachments?: unknown[];
  [key: string]: unknown;
}

// Placeholder services
class PredictiveAgent {
  async predictJobCompletion(jobId: string) {
    return { predictedCompletionDate: new Date(), confidence: 0.85 };
  }
  async predictOptimalPrice(jobData: unknown) {
    return { suggestedPrice: 1500, confidence: 0.75 };
  }
  async predictContractorMatch(jobId: string) {
    return { topContractors: [], matchScore: 0.8 };
  }
}
class JobStatusAgent {
  async analyzeStatusIssues(jobId: string) {
    return { issues: [], recommendations: [] };
  }
}
class BuildingSurveyorService {
  async analyzeImages(images: string[]) {
    return {
      issues: [],
      estimatedCost: 0,
      urgency: 'normal',
      recommendations: []
    };
  }
}
class JobAnalysisService {
  async analyzeJob(jobData: unknown) {
    return {
      complexity: 'medium',
      estimatedDuration: 7,
      requiredSkills: [],
      similarJobs: []
    };
  }
}
// Cache for AI analysis results
const aiAnalysisCache = new Map<string, { timestamp: number; data: Record<string, unknown> }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
function getCacheKey(jobId: string, imageUrls: string[]): string {
  const hash = crypto.createHash('sha256');
  hash.update(jobId);
  hash.update(imageUrls.sort().join(','));
  return hash.digest('hex');
}
export interface JobDetailsServiceConfig {
  supabase: SupabaseClient;
  enableAIAnalysis?: boolean;
  enableBuildingSurveyor?: boolean;
}
export interface UpdateJobData {
  title?: string;
  description?: string;
  category?: string;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  city?: string;
  postcode?: string;
  propertyType?: string;
  accessInfo?: string;
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  images?: string[];
  requirements?: string[];
  startDate?: string;
  endDate?: string;
  flexibleTimeline?: boolean;
  analyzeWithAI?: boolean;
  runBuildingSurvey?: boolean;
}
export class JobDetailsService {
  private repository: JobRepository;
  private validator: JobDetailsValidator;
  private config: JobDetailsServiceConfig;
  private predictiveAgent: PredictiveAgent;
  private jobStatusAgent: JobStatusAgent;
  private buildingSurveyor?: BuildingSurveyorService;
  private jobAnalysis?: JobAnalysisService;
  constructor(config: JobDetailsServiceConfig) {
    this.config = config;
    this.repository = new JobRepository(config.supabase);
    this.validator = new JobDetailsValidator();
    this.predictiveAgent = new PredictiveAgent();
    this.jobStatusAgent = new JobStatusAgent();
    if (config.enableBuildingSurveyor) {
      this.buildingSurveyor = new BuildingSurveyorService();
    }
    if (config.enableAIAnalysis) {
      this.jobAnalysis = new JobAnalysisService();
    }
  }
  /**
   * Get job with all details and relationships
   */
  async getJobWithDetails(jobId: string, user: User): Promise<JobDetail> {
    // Get basic job data
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    // Check access permissions
    if (!this.canViewJob(job, user)) {
      throw new Error('Unauthorized to view this job');
    }
    // Fetch additional details in parallel
    const [
      homeowner,
      contractor,
      property,
      bids,
      attachments,
      viewCount,
      aiAnalysis,
      predictions
    ] = await Promise.all([
      this.repository.getUser(job.homeowner_id),
      job.contractor_id ? this.repository.getUser(job.contractor_id) : null,
      job.property_id ? this.repository.getProperty(job.property_id) : null,
      this.repository.getBidsForJob(jobId),
      this.repository.getAttachmentsForJob(jobId),
      this.repository.getViewCount(jobId),
      this.getAIAnalysisFromCache(jobId),
      this.getPredictions(jobId)
    ]);
    // Build comprehensive job detail
    const jobDetail: JobDetail = {
      ...job,
      homeowner: this.sanitizeUserData(homeowner),
      contractor: contractor ? this.sanitizeUserData(contractor) : null,
      property,
      bids: user.role === 'homeowner' || user.id === job.homeowner_id ? bids : { count: bids.length },
      attachments,
      viewCount,
      aiAnalysis,
      predictions,
      canEdit: this.canEditJob(job, user),
      canDelete: this.canDeleteJob(job, user),
      canChangStatus: this.canChangeStatus(job, user)
    };
    // Add contractor-specific data
    if (user.role === 'contractor') {
      jobDetail.hasSubmittedBid = await this.repository.hasUserBidOnJob(jobId, user.id);
      jobDetail.isSerious = await this.checkSeriousBuyer(job.homeowner_id);
    }
    return jobDetail;
  }
  /**
   * Track job view by contractor
   */
  async trackJobView(jobId: string, userId: string): Promise<void> {
    try {
      await this.repository.incrementViewCount(jobId, userId);
    } catch (error) {
      logger.warn('Failed to track job view', { jobId, userId, error });
    }
  }
  /**
   * Full update of job
   */
  async updateJobFull(jobId: string, data: UpdateJobData, user: User): Promise<JobDetail> {
    // Get existing job
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    // Check permissions
    if (!this.canEditJob(job, user)) {
      throw new Error('Unauthorized to update this job');
    }
    // Validate update data
    const validatedData = this.validator.validateFullUpdate(data);
    // Prepare update payload
    const updatePayload: unknown = {
      ...validatedData,
      updated_at: new Date().toISOString()
    };
    // Handle location updates with geocoding
    if (validatedData.location || validatedData.postcode) {
      const geocodeResult = await this.geocodeLocation(
        validatedData.location || validatedData.postcode || ''
      );
      if (geocodeResult) {
        updatePayload.latitude = geocodeResult.lat;
        updatePayload.longitude = geocodeResult.lng;
      }
    }
    // Handle budget changes
    if (validatedData.budgetMin && validatedData.budgetMax) {
      updatePayload.budget = (validatedData.budgetMin + validatedData.budgetMax) / 2;
      updatePayload.budget_min = validatedData.budgetMin;
      updatePayload.budget_max = validatedData.budgetMax;
    }
    // Update the job
    const updatedJob = await this.repository.updateJob(jobId, updatePayload);
    // Handle image updates
    if (validatedData.images) {
      await this.repository.updateAttachments(jobId, validatedData.images);
    }
    // Handle requirements update
    if (validatedData.requirements) {
      await this.repository.updateJobRequirements(jobId, validatedData.requirements);
    }
    // Return updated job with details
    return this.getJobWithDetails(jobId, user);
  }
  /**
   * Partial update of job
   */
  async updateJobPartial(jobId: string, data: Partial<UpdateJobData>, user: User): Promise<JobDetail> {
    // Get existing job
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    // Check permissions
    if (!this.canEditJob(job, user)) {
      throw new Error('Unauthorized to update this job');
    }
    // Validate partial update
    const validatedData = this.validator.validatePartialUpdate(data);
    // Update the job
    const updatedJob = await this.repository.updateJob(jobId, {
      ...validatedData,
      updated_at: new Date().toISOString()
    });
    return this.getJobWithDetails(jobId, user);
  }
  /**
   * Delete job (soft delete)
   */
  async deleteJob(jobId: string, user: User): Promise<void> {
    // Get existing job
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    // Check permissions
    if (!this.canDeleteJob(job, user)) {
      throw new Error('Unauthorized to delete this job');
    }
    // Check if job can be deleted
    if (job.status === 'in_progress' || job.status === 'completed') {
      throw new Error('Cannot delete job that is in progress or completed');
    }
    // Check for active bids
    const bids = await this.repository.getBidsForJob(jobId);
    if (bids.some((bid: unknown) => bid.status === 'accepted')) {
      throw new Error('Cannot delete job with accepted bids');
    }
    // Perform soft delete
    await this.repository.softDeleteJob(jobId);
    // Clean up related data
    await Promise.all([
      this.repository.deleteAttachments(jobId),
      this.repository.cancelAllBids(jobId),
      this.notifyDeletion(jobId, job)
    ]);
  }
  /**
   * Run AI analysis on job
   */
  async runAIAnalysis(jobId: string, images: string[], runBuildingSurvey: boolean): Promise<unknown> {
    // Check cache first
    const cacheKey = getCacheKey(jobId, images);
    const cached = aiAnalysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    const analysisResults: Record<string, unknown> = {};
    // Run multiple AI analyses in parallel
    const promises = [];
    if (this.jobAnalysis) {
      promises.push(
        this.jobAnalysis.analyzeJob({ jobId, images })
          .then(result => { analysisResults.jobAnalysis = result; })
      );
    }
    if (runBuildingSurvey && this.buildingSurveyor) {
      promises.push(
        this.buildingSurveyor.analyzeImages(images)
          .then(result => { analysisResults.buildingSurvey = result; })
      );
    }
    promises.push(
      this.predictiveAgent.predictJobCompletion(jobId)
        .then(result => { analysisResults.completionPrediction = result; })
    );
    promises.push(
      this.predictiveAgent.predictOptimalPrice({ jobId, images })
        .then(result => { analysisResults.pricePrediction = result; })
    );
    await Promise.all(promises);
    // Cache the results
    aiAnalysisCache.set(cacheKey, {
      timestamp: Date.now(),
      data: analysisResults
    });
    // Store AI analysis reference in database
    await this.repository.storeAIAnalysis(jobId, analysisResults);
    return analysisResults;
  }
  // ============= Private Helper Methods =============
  private canViewJob(job: unknown, user: User): boolean {
    // Homeowner can always view their own job
    if (job.homeowner_id === user.id) return true;
    // Assigned contractor can view
    if (job.contractor_id === user.id) return true;
    // Admin can view all
    if (user.role === 'admin') return true;
    // Contractors can view posted jobs
    if (user.role === 'contractor' && job.status === 'posted') return true;
    return false;
  }
  private canEditJob(job: unknown, user: User): boolean {
    // Only homeowner can edit their job
    if (job.homeowner_id === user.id) return true;
    // Admin can edit
    if (user.role === 'admin') return true;
    return false;
  }
  private canDeleteJob(job: unknown, user: User): boolean {
    // Only homeowner can delete their job
    if (job.homeowner_id === user.id) return true;
    // Admin can delete
    if (user.role === 'admin') return true;
    return false;
  }
  private canChangeStatus(job: unknown, user: User): boolean {
    // Homeowner can change status
    if (job.homeowner_id === user.id) return true;
    // Assigned contractor can change certain statuses
    if (job.contractor_id === user.id) {
      return ['in_progress', 'completed'].includes(job.status);
    }
    // Admin can change status
    if (user.role === 'admin') return true;
    return false;
  }
  private sanitizeUserData(user: unknown): unknown {
    // Remove sensitive data from user object
    const { password, ...safeUser } = user;
    return safeUser;
  }
  private async checkSeriousBuyer(homeownerId: string): Promise<boolean> {
    // Check if homeowner is verified/serious
    const checks = await Promise.all([
      this.repository.isPhoneVerified(homeownerId),
      this.repository.hasActiveSubscription(homeownerId),
      this.repository.getJobPostingHistory(homeownerId)
    ]);
    const [phoneVerified, hasSubscription, history] = checks;
    return phoneVerified ||
           hasSubscription ||
           history.completedJobs > 0;
  }
  private async geocodeLocation(address: string): Promise<{ lat: number; lng: number } | null> {
    // TODO: Implement actual geocoding
    return null;
  }
  private async getAIAnalysisFromCache(jobId: string): Promise<unknown> {
    // TODO: Get from cache or database
    return null;
  }
  private async getPredictions(jobId: string): Promise<unknown> {
    // Get predictive insights
    try {
      const [completion, price, contractors] = await Promise.all([
        this.predictiveAgent.predictJobCompletion(jobId),
        this.predictiveAgent.predictOptimalPrice({ jobId }),
        this.predictiveAgent.predictContractorMatch(jobId)
      ]);
      return { completion, price, contractors };
    } catch (error) {
      logger.warn('Failed to get predictions', { jobId, error });
      return null;
    }
  }
  private async notifyDeletion(jobId: string, job: unknown): Promise<void> {
    // TODO: Send notifications about job deletion
    logger.info('Job deleted', { jobId, title: job.title });
  }
}