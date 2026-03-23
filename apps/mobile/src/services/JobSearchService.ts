/**
 * Job Search Service
 *
 * Handles job search and filtering operations:
 * - Getting jobs by various criteria
 * - Searching jobs by text
 * - Filtering jobs by status/user
 */

import { Job } from '@mintenance/types';
import { isValidSearchTerm } from '../utils/sqlSanitization';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { JobCRUDService } from './JobCRUDService';

const JOB_LIST_SELECT =
  'id, title, description, status, category, budget, budget_min, budget_max, location, homeowner_id, contractor_id, latitude, longitude, created_at, updated_at';

/** Fetch image URLs from job_attachments for a list of job IDs and attach as `photos` array. */
async function enrichJobsWithPhotos(
  jobs: Record<string, unknown>[]
): Promise<Job[]> {
  if (jobs.length === 0) return [];
  const jobIds = jobs.map((j) => j.id as string);
  const { data: attachments } = await supabase
    .from('job_attachments')
    .select('job_id, file_url')
    .in('job_id', jobIds)
    .eq('file_type', 'image');

  const photosByJob = new Map<string, string[]>();
  (attachments ?? []).forEach((att: { job_id: string; file_url: string }) => {
    if (!photosByJob.has(att.job_id)) photosByJob.set(att.job_id, []);
    photosByJob.get(att.job_id)!.push(att.file_url);
  });

  return jobs.map((j) => ({
    ...j,
    photos: photosByJob.get(j.id as string) ?? [],
  })) as unknown as Job[];
}

export class JobSearchService {
  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .eq('homeowner_id', homeownerId)
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('getJobsByHomeowner failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    return JobSearchService.getJobsByHomeowner(userId);
  }

  static async getAvailableJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .eq('status', 'posted')
      .is('contractor_id', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      logger.error('getAvailableJobs failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async getJobsByStatus(
    status: Job['status'],
    userId?: string
  ): Promise<Job[]> {
    let query = supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (userId) {
      query = query.or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);
    }
    const { data, error } = await query;
    if (error) {
      logger.error('getJobsByStatus failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async getJobsByUser(
    userId: string,
    role: 'homeowner' | 'contractor'
  ): Promise<Job[]> {
    const col = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';
    const { data, error } = await supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .eq(col, userId)
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('getJobsByUser failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async getJobs(arg1?: unknown, arg2?: unknown): Promise<Job[]> {
    let status: Job['status'] | undefined;
    let limit = 20;
    let offset = 0;

    const validStatuses = ['posted', 'assigned', 'in_progress', 'completed'];
    if (typeof arg1 === 'string' && validStatuses.includes(arg1)) {
      status = arg1 as Job['status'];
      if (typeof arg2 === 'number') limit = arg2;
    } else if (typeof arg1 === 'number') {
      limit = arg1;
      offset = typeof arg2 === 'number' ? arg2 : 0;
    } else if (typeof arg2 === 'number') {
      limit = arg2;
    }

    let query = supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      logger.error('getJobs failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async searchJobs(
    queryText: string,
    filters?: { category?: string; minBudget?: number; maxBudget?: number },
    limit: number = 20
  ): Promise<Job[]> {
    if (!isValidSearchTerm(queryText)) {
      logger.warn('Invalid search term rejected in JobSearchService');
      return [];
    }

    let query = supabase
      .from('jobs')
      .select(JOB_LIST_SELECT)
      .or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.minBudget != null)
      query = query.gte('budget', filters.minBudget);
    if (filters?.maxBudget != null)
      query = query.lte('budget', filters.maxBudget);

    const { data, error } = await query;
    if (error) {
      logger.error('searchJobs failed', { error });
      throw new Error(error.message);
    }
    return enrichJobsWithPhotos((data ?? []) as Record<string, unknown>[]);
  }

  static async getJob(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }
}
