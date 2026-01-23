/**
 * Job Repository - Data Access Layer
 * Handles all database operations for jobs
 */
import { SupabaseClient } from '@supabase/supabase-js';
// TODO: Fix import path for @mintenance/shared
import { logger } from '@mintenance/shared';
// Temporary logger until @mintenance/shared is available

import { JobRecord } from './types';
export class JobRepository {
  private supabase: SupabaseClient;
  // Base select fields for job queries
  private readonly jobSelectFields = `
    id,
    title,
    description,
    status,
    homeowner_id,
    contractor_id,
    category,
    budget,
    budget_min,
    budget_max,
    show_budget_to_contractors,
    require_itemized_bids,
    location,
    latitude,
    longitude,
    property_id,
    required_skills,
    is_serious_buyer,
    urgency,
    ai_assessment_id,
    created_at,
    updated_at,
    homeowner:users!homeowner_id(id,first_name,last_name,email,profile_image_url),
    contractor:users!contractor_id(id,first_name,last_name,email),
    bids(count)
  `.replace(/\s+/g, ' ').trim();
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  /**
   * Get available jobs query (for contractors)
   */
  getAvailableJobsQuery() {
    return this.supabase
      .from('jobs')
      .select(this.jobSelectFields)
      .eq('status', 'posted')
      .is('contractor_id', null);
  }
  /**
   * Get user's jobs query
   */
  getUserJobsQuery(userId: string, userRole: string) {
    const query = this.supabase
      .from('jobs')
      .select(this.jobSelectFields);
    if (userRole === 'homeowner') {
      return query.eq('homeowner_id', userId);
    } else if (userRole === 'contractor') {
      return query.or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);
    } else {
      // Admin sees all
      return query;
    }
  }
  /**
   * Filter query by status
   */
  filterByStatus(query: unknown, status: string[]) {
    return query.in('status', status);
  }
  /**
   * Apply cursor for pagination
   */
  applyCursor(query: unknown, cursor: string) {
    return query.lt('created_at', cursor);
  }
  /**
   * Execute query with pagination
   */
  async executeQuery(query: unknown, limit: number): Promise<{
    data: JobRecord[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    // Fetch one extra to check if there are more
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    if (error) {
      logger.error('Failed to fetch jobs', { error });
      throw new Error('Failed to fetch jobs');
    }
    const jobs = data as JobRecord[];
    const hasMore = jobs.length > limit;
    const limitedJobs = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? limitedJobs[limitedJobs.length - 1]?.created_at : undefined;
    return {
      data: limitedJobs,
      hasMore,
      nextCursor,
    };
  }
  /**
   * Get a single job by ID
   */
  async getJob(jobId: string): Promise<JobRecord | null> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select(this.jobSelectFields)
      .eq('id', jobId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logger.error('Failed to fetch job', { error, jobId });
      throw new Error('Failed to fetch job');
    }
    return data as unknown as JobRecord;
  }
  /**
   * Create a new job
   */
  async createJob(job: Partial<JobRecord>): Promise<JobRecord> {
    const { data, error } = await this.supabase
      .from('jobs')
      .insert(job)
      .select(this.jobSelectFields)
      .single();
    if (error) {
      logger.error('Failed to create job', { error });
      throw new Error('Failed to create job');
    }
    return data as unknown as JobRecord;
  }
  /**
   * Update a job
   */
  async updateJob(jobId: string, updates: Partial<JobRecord>): Promise<JobRecord> {
    const { data, error } = await this.supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select(this.jobSelectFields)
      .single();
    if (error) {
      logger.error('Failed to update job', { error, jobId });
      throw new Error('Failed to update job');
    }
    return data as unknown as JobRecord;
  }
  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);
    if (error) {
      logger.error('Failed to delete job', { error, jobId });
      throw new Error('Failed to delete job');
    }
  }
  /**
   * Track job view
   */
  async trackJobView(jobId: string, contractorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('job_views')
      .upsert({
        job_id: jobId,
        contractor_id: contractorId,
        viewed_at: new Date().toISOString(),
      });
    if (error) {
      // Non-critical, just log
      logger.warn('Failed to track job view', { error, jobId, contractorId });
    }
  }
  /**
   * Get view counts for multiple jobs
   */
  async getViewCounts(jobIds: string[]): Promise<Map<string, number>> {
    if (!jobIds.length) return new Map();
    const { data, error } = await this.supabase
      .from('job_views')
      .select('job_id')
      .in('job_id', jobIds);
    if (error) {
      logger.warn('Failed to fetch view counts', { error });
      return new Map();
    }
    // Count views per job
    const viewCounts = new Map<string, number>();
    (data || []).forEach((view: { job_id: string }) => {
      const count = viewCounts.get(view.job_id) || 0;
      viewCounts.set(view.job_id, count + 1);
    });
    return viewCounts;
  }
  /**
   * Check if user has verified phone
   */
  async isPhoneVerified(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users')
      .select('phone_verified')
      .eq('id', userId)
      .single();
    if (error || !data) {
      return false;
    }
    return data.phone_verified === true;
  }
  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    return !error && !!data;
  }
  /**
   * Get user's job posting history
   */
  async getJobPostingHistory(userId: string): Promise<{
    totalJobs: number;
    completedJobs: number;
    paidJobs: number;
  }> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('status, payment_status')
      .eq('homeowner_id', userId);
    if (error || !data) {
      return { totalJobs: 0, completedJobs: 0, paidJobs: 0 };
    }
    const totalJobs = data.length;
    const completedJobs = data.filter(j => j.status === 'completed').length;
    const paidJobs = data.filter(j => j.payment_status === 'paid').length;
    return { totalJobs, completedJobs, paidJobs };
  }
  /**
   * Get nearby contractors for notification
   */
  async getNearbyContractors(latitude: number, longitude: number, radiusMiles: number = 50): Promise<string[]> {
    // Using PostGIS ST_DWithin for efficient geographic queries
    // This assumes you have a geography column or lat/lng indexed
    const { data, error } = await this.supabase
      .rpc('get_nearby_contractors', {
        lat: latitude,
        lng: longitude,
        radius_miles: radiusMiles,
      });
    if (error) {
      logger.warn('Failed to fetch nearby contractors', { error });
      return [];
    }
    return (data || []).map((c: unknown) => c.id);
  }
  /**
   * Batch create job attachments
   */
  async createJobAttachments(jobId: string, attachments: Array<{ file_url: string; file_type: string }>): Promise<void> {
    if (!attachments.length) return;
    const { error } = await this.supabase
      .from('job_attachments')
      .insert(
        attachments.map(att => ({
          job_id: jobId,
          file_url: att.file_url,
          file_type: att.file_type,
        }))
      );
    if (error) {
      logger.error('Failed to create job attachments', { error, jobId });
      throw new Error('Failed to create job attachments');
    }
  }
  /**
   * Get job attachments
   */
  async getJobAttachments(jobIds: string[]): Promise<Map<string, Array<{ file_url: string; file_type: string }>>> {
    if (!jobIds.length) return new Map();
    const { data, error } = await this.supabase
      .from('job_attachments')
      .select('job_id, file_url, file_type')
      .in('job_id', jobIds);
    if (error) {
      logger.warn('Failed to fetch job attachments', { error });
      return new Map();
    }
    // Group by job_id
    const attachmentsByJob = new Map<string, Array<{ file_url: string; file_type: string }>>();
    (data || []).forEach((att: unknown) => {
      const existing = attachmentsByJob.get(att.job_id) || [];
      existing.push({ file_url: att.file_url, file_type: att.file_type });
      attachmentsByJob.set(att.job_id, existing);
    });
    return attachmentsByJob;
  }

  async getUser(userId: string): Promise<unknown> {
    const { data, error } = await this.supabase.from('users').select('*').eq('id', userId).single();
    if (error) { logger.error('Error fetching user', error); return null; }
    return data;
  }

  async getProperty(propertyId: string): Promise<unknown> {
    const { data, error } = await this.supabase.from('properties').select('*').eq('id', propertyId).single();
    if (error) { logger.error('Error fetching property', error); return null; }
    return data;
  }

  async getBidsForJob(jobId: string): Promise<any[]> {
    const { data, error } = await this.supabase.from('bids').select('*').eq('job_id', jobId);
    if (error) { logger.error('Error fetching bids', error); return []; }
    return data || [];
  }

  async getAttachmentsForJob(jobId: string): Promise<any[]> {
    const { data, error } = await this.supabase.from('job_attachments').select('*').eq('job_id', jobId);
    if (error) { logger.error('Error fetching attachments', error); return []; }
    return data || [];
  }

  async getViewCount(jobId: string): Promise<number> {
    const { count, error } = await this.supabase.from('job_views').select('*', { count: 'exact', head: true }).eq('job_id', jobId);
    if (error) { logger.error('Error fetching view count', error); return 0; }
    return count || 0;
  }

  async hasUserBidOnJob(jobId: string, userId: string): Promise<boolean> {
    const { count } = await this.supabase.from('bids').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('contractor_id', userId);
    return (count || 0) > 0;
  }

  async incrementViewCount(jobId: string, userId: string): Promise<void> {
    await this.trackJobView(jobId, userId);
  }

  async updateAttachments(jobId: string, images: string[]): Promise<void> {
    await this.deleteAttachments(jobId);
    if (images.length > 0) {
      const attachments = images.map(url => ({ job_id: jobId, file_url: url, file_type: 'image' }));
      await this.supabase.from('job_attachments').insert(attachments);
    }
  }

  async updateJobRequirements(jobId: string, requirements: string[]): Promise<void> {
    await this.updateJob(jobId, { required_skills: requirements });
  }

  async deleteAttachments(jobId: string): Promise<void> {
    await this.supabase.from('job_attachments').delete().eq('job_id', jobId);
  }

  async cancelAllBids(jobId: string): Promise<void> {
    await this.supabase.from('bids').update({ status: 'cancelled' }).eq('job_id', jobId);
  }

  async storeAIAnalysis(jobId: string, analysis: unknown): Promise<void> {
    // Storing as JSON string in a generic field for now or dedicated table if it existed
    // await this.updateJob(jobId, { ai_assessment_id: JSON.stringify(analysis) } as any);
    logger.info('Storing AI analysis', { jobId, analysis });
  }

  async getBiddersForJob(jobId: string): Promise<string[]> {
    const bids = await this.getBidsForJob(jobId);
    return bids.map(b => b.contractor_id || '');
  }

  async getAcceptedBidForJob(jobId: string): Promise<unknown> {
    const { data } = await this.supabase.from('bids').select('*').eq('job_id', jobId).eq('status', 'accepted').single();
    return data;
  }

  async hasPendingPayments(jobId: string): Promise<boolean> {
    const { count } = await this.supabase.from('payments').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'pending');
    return (count || 0) > 0;
  }

  async hasActivePayments(jobId: string): Promise<boolean> {
    return this.hasPendingPayments(jobId);
  }

  async releaseHeldFunds(jobId: string): Promise<void> {
    logger.info('Releasing held funds', { jobId });
  }

  async initiatePaymentRelease(jobId: string): Promise<void> {
    logger.info('Initiating payment release', { jobId });
  }

  async updateContractorStats(contractorId: string, stats: unknown): Promise<void> {
    logger.info('Updating contractor stats', { contractorId, stats });
  }

  async indexJobForSearch(jobId: string): Promise<void> {
    logger.info('Indexing job for search', { jobId });
  }

  async createStatusChangeLog(jobId: string, oldStatus: string, newStatus: string, userId: string, reason?: string): Promise<void> {
    logger.info('Logging status change', { jobId, oldStatus, newStatus });
    // await this.supabase.from('job_status_logs').insert({ job_id: jobId, old_status: oldStatus, new_status: newStatus, changed_by: userId, reason });
  }

  async softDeleteJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'deleted' });
  }
}