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
import { mobileApiClient } from '../utils/mobileApiClient';
import { JobCRUDService } from './JobCRUDService';

/** The web API wraps job arrays in { jobs: [...] } */
interface JobsApiResponse {
  jobs: Job[];
  nextCursor?: string;
}

/** Safely extract the jobs array from an API response that may be wrapped or raw */
function extractJobs(response: unknown): Job[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'jobs' in response) {
    return (response as JobsApiResponse).jobs || [];
  }
  return [];
}

export class JobSearchService {
  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    const response = await mobileApiClient.get<JobsApiResponse>(
      `/api/jobs?homeowner_id=${encodeURIComponent(homeownerId)}&order=created_at&direction=desc`
    );
    return extractJobs(response);
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    const response = await mobileApiClient.get<JobsApiResponse>(
      `/api/jobs?homeowner_id=${encodeURIComponent(userId)}&order=created_at&direction=desc`
    );
    return extractJobs(response);
  }

  static async getAvailableJobs(): Promise<Job[]> {
    const response = await mobileApiClient.get<JobsApiResponse>(
      '/api/jobs?status=posted&order=created_at&direction=desc&limit=20'
    );
    return extractJobs(response);
  }

  static async getJobsByStatus(
    status: Job['status'],
    userId?: string
  ): Promise<Job[]> {
    let url = `/api/jobs?status=${encodeURIComponent(status)}&order=created_at&direction=desc`;
    if (userId) {
      url += `&userId=${encodeURIComponent(userId)}`;
    }
    const response = await mobileApiClient.get<JobsApiResponse>(url);
    return extractJobs(response);
  }

  static async getJobsByUser(userId: string, role: 'homeowner' | 'contractor'): Promise<Job[]> {
    const param = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';
    const response = await mobileApiClient.get<JobsApiResponse>(
      `/api/jobs?${param}=${encodeURIComponent(userId)}&order=created_at&direction=desc`
    );
    return extractJobs(response);
  }

  static async getJobs(arg1?: unknown, arg2?: unknown): Promise<Job[]> {
    let status: Job['status'] | undefined;
    let limit: number | undefined;
    let offset: number | undefined;

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

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('order', 'created_at');
    params.set('direction', 'desc');
    if (typeof limit === 'number') params.set('limit', String(limit));
    else params.set('limit', '20');
    if (typeof offset === 'number') params.set('offset', String(offset));

    const response = await mobileApiClient.get<JobsApiResponse>(`/api/jobs?${params.toString()}`);
    return extractJobs(response);
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

    const params = new URLSearchParams();
    params.set('search', queryText);
    params.set('order', 'created_at');
    params.set('direction', 'desc');
    params.set('limit', String(limit));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.minBudget != null) params.set('minBudget', String(filters.minBudget));
    if (filters?.maxBudget != null) params.set('maxBudget', String(filters.maxBudget));

    const response = await mobileApiClient.get<JobsApiResponse>(`/api/jobs?${params.toString()}`);
    return extractJobs(response);
  }

  static async getJob(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }
}
