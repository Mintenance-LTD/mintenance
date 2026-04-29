/**
 * Job Search Service
 *
 * Handles job search and filtering operations:
 * - Getting jobs by various criteria
 * - Searching jobs by text
 * - Filtering jobs by status / user
 *
 * Audit step 5 (2026-04-29): every method now routes exclusively
 * through the web API (`GET /api/jobs`). The previous direct-Supabase
 * paths returned unsigned `Job-storage` URLs that 404 on the CDN
 * after the 2026-04-17 bucket flip and silently ignored the
 * server-side `auth.uid()` scope. The API endpoint already enriches
 * each row with re-signed `photos: string[]`, so the helper that
 * fetched `job_attachments` separately is gone too.
 *
 * The API ignores caller-supplied user filters (`homeowner_id`,
 * `contractor_id`, `userId`) and instead auto-scopes via the session
 * token. The legacy params are still appended to the URL as a
 * diagnostic aid (audit log + caller-side test assertion target);
 * the route's Zod schema is non-strict so they're accepted-and-
 * ignored without 400'ing.
 */

import { Job } from '@mintenance/types';
import { jobListResponseSchema } from '@mintenance/api-contracts';
import { safeValidateResponse } from '@mintenance/api-client';
import { isValidSearchTerm } from '../utils/sqlSanitization';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import { JobCRUDService } from './JobCRUDService';

interface JobsListResponse {
  jobs: Array<Record<string, unknown>>;
  nextCursor?: string | null;
}

/**
 * Build a `/api/jobs?...` URL from a flat param object, dropping
 * undefined / null entries so the resulting URL only encodes
 * intentional filters. Numeric values are stringified by
 * URLSearchParams.
 */
function buildJobsUrl(
  params: Record<string, string | number | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `/api/jobs?${qs}` : '/api/jobs';
}

/**
 * Pull `jobs` out of an API response, tolerating both the canonical
 * `{ jobs: [...] }` envelope and a bare-array response (older mobile
 * builds + a couple of the test fixtures). Returns `[]` for any
 * other shape so callers don't have to null-check.
 */
function unwrapJobs(response: unknown): Job[] {
  if (Array.isArray(response)) return response as unknown as Job[];
  if (response && typeof response === 'object' && 'jobs' in response) {
    const jobs = (response as JobsListResponse).jobs;
    if (Array.isArray(jobs)) return jobs as unknown as Job[];
  }
  return [];
}

export class JobSearchService {
  /**
   * Returns the homeowner's own jobs. The API auto-scopes by
   * `auth.uid()` so the supplied id is informational; we still pass
   * it on the URL so server-side logs can spot mismatches.
   */
  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    const url = buildJobsUrl({ homeowner_id: homeownerId });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    // Same shape as getJobsByHomeowner — preserved for API
    // compatibility with screens that pre-date the role split.
    const url = buildJobsUrl({ homeowner_id: userId });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  /**
   * Discoverable jobs for a contractor — `posted` + unassigned. The
   * route applies the same filter server-side (`status=posted`); the
   * 20-row default mirrors `JobQueryService.listJobs`'s pagination
   * cap.
   *
   * Audit step 15 (2026-04-29): demonstrates the runtime-validation
   * helper. We pass the raw response through `safeValidateResponse`
   * with the shared `jobListResponseSchema` so that if the API
   * envelope drifts (renamed key, dropped column, type change) we
   * see a structured warning in logs instead of half-rendering with
   * the wrong shape silently. Using the safe (non-throwing) variant
   * here so a single malformed row doesn't break the explore-map
   * screen entirely; the user sees the rest of the list and we get
   * a Sentry breadcrumb to fix the contract.
   */
  static async getAvailableJobs(): Promise<Job[]> {
    const url = buildJobsUrl({ status: 'posted', limit: 20 });
    const response = await mobileApiClient.get<unknown>(url);
    const validation = safeValidateResponse(jobListResponseSchema, response);
    if (!validation.success) {
      logger.warn(
        'getAvailableJobs: response failed shape validation; rendering best-effort',
        { error: validation.error }
      );
    }
    return unwrapJobs(response);
  }

  static async getJobsByStatus(
    status: Job['status'],
    userId?: string
  ): Promise<Job[]> {
    const url = buildJobsUrl({ status, userId });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  static async getJobsByUser(
    userId: string,
    role: 'homeowner' | 'contractor'
  ): Promise<Job[]> {
    const key = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';
    const url = buildJobsUrl({ [key]: userId });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  /**
   * Generic list with backwards-compat overloaded signature:
   *   getJobs(status, limit?)
   *   getJobs(limit, offset?)
   *   getJobs()
   * Status is validated against the live DB enum so callers can't
   * smuggle arbitrary strings through.
   */
  static async getJobs(arg1?: unknown, arg2?: unknown): Promise<Job[]> {
    let status: Job['status'] | undefined;
    let limit = 20;
    let offset: number | undefined;

    const validStatuses: Array<Job['status']> = [
      'posted',
      'assigned',
      'in_progress',
      'completed',
    ];
    if (
      typeof arg1 === 'string' &&
      (validStatuses as string[]).includes(arg1)
    ) {
      status = arg1 as Job['status'];
      if (typeof arg2 === 'number') limit = arg2;
    } else if (typeof arg1 === 'number') {
      limit = arg1;
      if (typeof arg2 === 'number') offset = arg2;
    } else if (typeof arg2 === 'number') {
      limit = arg2;
    }

    const url = buildJobsUrl({ status, limit, offset });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  /**
   * Full-text search. The `isValidSearchTerm` guard rejects payloads
   * with SQL meta-chars early so the backend doesn't even see the
   * request. The /api/jobs route also runs `sanitizeIlikePattern` on
   * `search` before passing to PostgREST `.ilike()`, but defending
   * at the client too means the user gets an obvious "invalid
   * search" message instead of a misleading 0-results page.
   */
  static async searchJobs(
    queryText: string,
    filters?: { category?: string; minBudget?: number; maxBudget?: number },
    limit: number = 20
  ): Promise<Job[]> {
    if (!isValidSearchTerm(queryText)) {
      logger.warn('Invalid search term rejected in JobSearchService');
      return [];
    }

    const url = buildJobsUrl({
      search: queryText,
      category: filters?.category,
      minBudget: filters?.minBudget,
      maxBudget: filters?.maxBudget,
      limit,
    });
    const response = await mobileApiClient.get<JobsListResponse>(url);
    return unwrapJobs(response);
  }

  static async getJob(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }
}
