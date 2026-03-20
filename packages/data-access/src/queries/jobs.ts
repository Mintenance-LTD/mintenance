/**
 * Job query definitions — consistent across web and mobile.
 *
 * Usage:
 *   import { fetchJobDetail } from '@mintenance/data-access';
 *   const job = await fetchJobDetail(supabaseClient, jobId);
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Select strings ─────────────────────────────────────────────

/** Columns returned for a job detail view (both web page and mobile screen). */
export const JOB_DETAIL_SELECT = `
  id, title, description, status, homeowner_id, contractor_id,
  category, budget, budget_min, budget_max, location, city, postcode,
  latitude, longitude, priority, start_date, end_date, flexible_timeline,
  access_info, requirements, property_id, completed_at,
  scheduled_start_date, scheduled_end_date, scheduled_duration_hours,
  created_at, updated_at
` as const;

/** Columns for a bid with contractor profile join. */
export const BID_WITH_CONTRACTOR_SELECT = `
  id, amount, description, message, status, created_at, updated_at,
  estimated_duration_days, proposed_start_date, materials_included, warranty_months,
  contractor_id,
  contractor:profiles!bids_contractor_id_fkey(
    id, first_name, last_name, email, phone, profile_image_url,
    company_name, city, bio, hourly_rate, years_experience
  ),
  quote:contractor_quotes!quote_id(id, line_items, total_amount)
` as const;

/** Columns for job photos (before/after evidence). */
export const JOB_PHOTOS_SELECT = `
  id, photo_url, photo_type, created_at, quality_score, verified, geolocation
` as const;

/** Columns for contract status display. */
export const CONTRACT_STATUS_SELECT = `
  id, status, title, amount, start_date, end_date,
  contractor_signed_at, homeowner_signed_at, created_at, updated_at
` as const;

// ─── Query functions ─────────────────────────────────────────────

/**
 * Fetch full job detail with all related data.
 * Both web SSR and mobile screens should use this for the job detail view.
 */
export async function fetchJobDetail(client: SupabaseClient, jobId: string) {
  const [jobResult, bidsResult, photosResult, contractResult, escrowResult] =
    await Promise.all([
      client.from('jobs').select(JOB_DETAIL_SELECT).eq('id', jobId).single(),
      client
        .from('bids')
        .select(BID_WITH_CONTRACTOR_SELECT)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false }),
      client
        .from('job_photos_metadata')
        .select(JOB_PHOTOS_SELECT)
        .eq('job_id', jobId)
        .in('photo_type', ['before', 'after'])
        .order('created_at', { ascending: true }),
      client
        .from('contracts')
        .select(CONTRACT_STATUS_SELECT)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1),
      client
        .from('escrow_transactions')
        .select('id, status, amount, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  return {
    job: jobResult.data,
    jobError: jobResult.error,
    bids: bidsResult.data ?? [],
    photos: photosResult.data ?? [],
    contract: contractResult.data?.[0] ?? null,
    escrow: escrowResult.data?.[0] ?? null,
  };
}

/**
 * Fetch job list with homeowner filtering.
 */
export async function fetchJobsByHomeowner(
  client: SupabaseClient,
  homeownerId: string,
  options: { limit?: number; offset?: number; status?: string } = {}
) {
  const { limit = 20, offset = 0, status } = options;

  let query = client
    .from('jobs')
    .select(
      'id, title, description, status, category, budget, location, created_at, updated_at, contractor_id'
    )
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  return query;
}

/**
 * Fetch available jobs for contractor browsing.
 */
export async function fetchAvailableJobs(
  client: SupabaseClient,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = options;

  return client
    .from('jobs')
    .select(
      'id, title, description, status, category, budget, budget_min, budget_max, location, latitude, longitude, created_at'
    )
    .eq('status', 'posted')
    .is('contractor_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}
