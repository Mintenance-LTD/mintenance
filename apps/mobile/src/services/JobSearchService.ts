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

export class JobSearchService {
  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    const jobs = await mobileApiClient.get<Job[]>(
      `/api/jobs?homeowner_id=${encodeURIComponent(homeownerId)}&order=created_at&direction=desc`
    );
    return jobs || [];
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    const jobs = await mobileApiClient.get<Job[]>(
      `/api/jobs?homeowner_id=${encodeURIComponent(userId)}&order=created_at&direction=desc`
    );
    return jobs || [];
  }

  static async getAvailableJobs(): Promise<Job[]> {
    const jobs = await mobileApiClient.get<Job[]>(
      '/api/jobs?status=posted&order=created_at&direction=desc&limit=20'
    );
    return jobs || [];
  }

  static async getJobsByStatus(
    status: Job['status'],
    userId?: string
  ): Promise<Job[]> {
    let url = `/api/jobs?status=${encodeURIComponent(status)}&order=created_at&direction=desc`;
    if (userId) {
      url += `&userId=${encodeURIComponent(userId)}`;
    }
    const jobs = await mobileApiClient.get<Job[]>(url);
    return jobs || [];
  }

  static async getJobsByUser(userId: string, role: 'homeowner' | 'contractor'): Promise<Job[]> {
    const param = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';
    const jobs = await mobileApiClient.get<Job[]>(
      `/api/jobs?${param}=${encodeURIComponent(userId)}&order=created_at&direction=desc`
    );
    return jobs || [];
  }

  // Generic job retrieval with pagination
  static async getJobs(arg1?: unknown, arg2?: unknown): Promise<Job[]> {
    // Overloaded signature support:
    // - getJobs(status?: Job['status'], limit?: number)
    // - getJobs(limit?: number, offset?: number)
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

    const jobs = await mobileApiClient.get<Job[]>(`/api/jobs?${params.toString()}`);
    return jobs || [];
  }

  // Search jobs by title, description, location, or category
  static async searchJobs(
    queryText: string,
    filters?: { category?: string; minBudget?: number; maxBudget?: number },
    limit: number = 20
  ): Promise<Job[]> {
    // Validate search input
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

    const jobs = await mobileApiClient.get<Job[]>(`/api/jobs?${params.toString()}`);
    return jobs || [];
  }

  // Get single job (alias for getJobById for consistency)
  static async getJob(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }
}
