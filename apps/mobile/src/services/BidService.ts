import { mobileApiClient } from '../utils/mobileApiClient';
import { BidManagementService } from './BidManagementService';

export interface BidData {
  job_id: string;
  contractor_id: string;
  amount: number;
  message: string;
  // 2026-05-26 audit-59 P2: the API returns estimated_duration_days
  // (number, server-stamped from estimatedDurationDays on submit).
  // The legacy `estimated_duration: string` field was kept around for
  // backward compat but never populated by /api/jobs/:id/bids — the
  // homeowner card + timeline sort were reading undefined. Track the
  // canonical field; keep the old key as a soft-deprecated alias for
  // any in-flight callers (none in source today, but the mobile
  // schema's strict types previously paired with it).
  estimated_duration_days?: number;
  /** @deprecated Use estimated_duration_days. Kept for legacy callers. */
  estimated_duration?: string;
  availability?: string;
}

export interface Bid extends BidData {
  id: string;
  // 2026-05-27 audit-73 P2: server-side withdraw endpoint
  // (/api/jobs/[id]/bids/[bidId]/withdraw) writes `status='withdrawn'`
  // on the row, and JobDetailsCTA already special-cases it for the
  // "Submit a New Bid" affordance. Including it in the discriminated
  // union here prevents future consumers (typed lookups, switch
  // statements, test fixtures) from missing the state. Live data
  // shows 0 withdrawn rows today, but the write path creates them.
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  contractor?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    rating?: number;
    reviews_count?: number;
    profile_picture?: string;
    company_name?: string;
    city?: string;
    bio?: string;
    hourly_rate?: number;
    years_experience?: number;
    profile_image_url?: string;
  };
  /**
   * @deprecated Legacy alias for `jobs`. Only populated by the manual
   * createBid wire path; routes that return bids via PostgREST embed
   * the relation under the table name (`jobs`). New callers should
   * read `bid.jobs ?? bid.job` so both paths work, or migrate to
   * `bid.jobs` directly.
   */
  job?: {
    id: string;
    title: string;
    description: string;
    budget: number;
    category?: string;
    status: string;
    location?: string;
    created_at: string;
  };
  /**
   * 2026-05-27 audit-77 P1: PostgREST embeds the related row under
   * the table name. `/api/contractor/bids` selects `jobs (...)`, so
   * the result row carries `bid.jobs` not `bid.job`. JobsScreen's
   * "Bids Sent" filter was reading the legacy `job` key (always
   * undefined on the wire), filtering every pending bid out as
   * undefined and rendering an empty list even when the contractor
   * had open bids. Adding the canonical key here so typed reads
   * succeed; consumers should prefer `bid.jobs` going forward.
   */
  jobs?: {
    id: string;
    title: string;
    description: string;
    budget: number;
    category?: string;
    status: string;
    location?: string;
    created_at: string;
    photos?: string[] | null;
    homeowner_id?: string | null;
    homeowner?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      profile_image_url: string | null;
    } | null;
  };
}

export class BidService {
  /**
   * Rich-payload submit (line items, tax, terms, ...). Wraps the
   * legacy BidManagementService.submitBid which routes through
   * /api/contractor/submit-bid. Use this from screens; use
   * createBid for the simpler `BidData` shape.
   */
  static async submitBid(
    bidData: Parameters<typeof BidManagementService.submitBid>[0]
  ): ReturnType<typeof BidManagementService.submitBid> {
    return BidManagementService.submitBid(bidData);
  }

  static async createBid(bidData: BidData): Promise<Bid> {
    if (bidData.amount <= 0) {
      throw new Error('Bid amount must be greater than 0');
    }
    if (!bidData.message.trim()) {
      throw new Error('Bid message is required');
    }

    const result = await BidManagementService.submitBid({
      jobId: bidData.job_id,
      contractorId: bidData.contractor_id,
      amount: bidData.amount,
      description: bidData.message,
    });

    return {
      ...bidData,
      id: result.id,
      status: result.status as Bid['status'],
      created_at: result.createdAt,
      updated_at: result.createdAt,
    };
  }

  /**
   * List bids on a single job (homeowner-only via the route's
   * ownership check, plus admin override). Audit step 5
   * (2026-04-29): migrated off the direct-Supabase read that did
   * its own `reviews` rollup — the route now returns each bid with
   * `contractor.reviews_count` and `contractor.rating` already
   * attached by `JobQueryService`-style enrichment.
   */
  static async getBidsByJob(jobId: string, status?: string): Promise<Bid[]> {
    const url = status
      ? `/api/jobs/${jobId}/bids?status=${encodeURIComponent(status)}`
      : `/api/jobs/${jobId}/bids`;
    const response = await mobileApiClient.get<{ bids?: Bid[] | null }>(url);
    return Array.isArray(response.bids) ? response.bids : [];
  }

  /**
   * Multi-job pending-bids fan-out used by the homeowner dashboard
   * to show "recent bids across your jobs". The mobile dashboard
   * already caps the input at 10 jobs, so 10 parallel API calls is
   * acceptable; a dedicated `/api/homeowner/bids?status=&jobIds=`
   * endpoint would be a nice future optimisation but isn't in the
   * critical path.
   */
  static async getBidsByJobs(
    jobIds: string[],
    status?: string
  ): Promise<Bid[]> {
    if (jobIds.length === 0) return [];
    const results = await Promise.all(
      jobIds.map((id) =>
        BidService.getBidsByJob(id, status).catch(() => [] as Bid[])
      )
    );
    // Match the previous direct-DB ordering (`.order('created_at',
    // { ascending: false })`) so the homeowner dashboard's "recent
    // bids" stays in the same order across the migration.
    return results.flat().sort((a, b) => {
      const aTs = a.created_at ?? '';
      const bTs = b.created_at ?? '';
      return bTs.localeCompare(aTs);
    });
  }

  /**
   * List the calling contractor's bids. The route auto-scopes via
   * `auth.uid()`; the supplied `contractorId` is informational
   * (matches caller-side test assertions) and accepted-and-ignored
   * by the non-strict route schema.
   */
  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const url = `/api/contractor/bids?contractorId=${encodeURIComponent(contractorId)}`;
    const response = await mobileApiClient.get<{ bids?: Bid[] | null }>(url);
    return Array.isArray(response.bids) ? response.bids : [];
  }

  /**
   * 2026-05-24 audit-26 P1: fetch the calling contractor's bid on a
   * single job (zero or one row). Used by JobDetailsScreen so a
   * contractor opening a job they already bid on sees the
   * "Bid Pending — Edit Bid" CTA instead of "Submit Bid". The
   * /api/jobs/:id/bids endpoint is owner-gated and 403s for
   * contractors; /api/contractor/bids?jobId= is scoped via
   * `contractor_id = auth.uid()` so this round-trip is safe.
   */
  static async getMyBidForJob(jobId: string): Promise<Bid | null> {
    if (!jobId) return null;
    const url = `/api/contractor/bids?jobId=${encodeURIComponent(jobId)}`;
    const response = await mobileApiClient.get<{ bids?: Bid[] | null }>(url);
    const bids = Array.isArray(response.bids) ? response.bids : [];
    return bids[0] ?? null;
  }

  /**
   * Fetch a single bid by id. Requires `jobId` because bids live under the
   * nested `/api/jobs/:jobId/bids/:bidId` route. The endpoint authorizes the
   * bid's own contractor, the job's homeowner, or an admin; anything else
   * (404/403) surfaces as a thrown error which callers may treat as "no row".
   *
   * Primary consumer is the offline ConflictManager, which fetches current
   * server state for a queued bid mutation to detect conflicts. Previously
   * conflict detection for bids was a no-op because no by-id fetch existed.
   */
  static async getBidById(jobId: string, bidId: string): Promise<Bid | null> {
    if (!jobId || !bidId) return null;
    const response = await mobileApiClient.get<{ bid?: Bid | null }>(
      `/api/jobs/${jobId}/bids/${bidId}`
    );
    return response.bid ?? null;
  }

  /**
   * Mutation methods all hit the nested route
   * `/api/jobs/:jobId/bids/:bidId/...` which requires both ids in
   * the URL. Audit step 11 (2026-04-29): the previous helper
   * `getBidJobId(bidId)` did a direct-DB lookup of `bids.job_id`
   * to keep the public surface bidId-only. Every screen-side
   * caller (BidReviewScreen, JobDetailsScreen, ContractorAssignment)
   * already had `jobId` in scope, so the helper was a needless
   * round-trip + the last `supabase.from(...)` import in this file.
   *
   * Now: callers must pass `jobId` explicitly. The helper + the
   * supabase import are gone.
   */

  /**
   * 2026-05-23: server routes return { success, message } — they don't
   * echo the updated bid row. The previous type contract claimed
   * `Promise<Bid>` and `return response.bid` resolved to `undefined`
   * at runtime, so any caller that depended on the return got
   * undefined. Now matches the wire contract exactly. Current callers
   * (BidReviewScreen, ContractorAssignment) ignore the return value;
   * any future caller that needs the fresh bid row should refetch via
   * getBidsByJob / getBidById.
   */
  static async acceptBid(
    bidId: string,
    jobId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!jobId) throw new Error('jobId is required to accept a bid');
    return mobileApiClient.post<{ success: boolean; message: string }>(
      `/api/jobs/${jobId}/bids/${bidId}/accept`
    );
  }

  static async rejectBid(
    bidId: string,
    jobId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!jobId) throw new Error('jobId is required to reject a bid');
    return mobileApiClient.post<{ success: boolean; message: string }>(
      `/api/jobs/${jobId}/bids/${bidId}/reject`,
      { reason }
    );
  }

  /**
   * Reverse a recent rejection (60-second server-side window). Fires
   * from the BidReview undo banner — see /api/jobs/[id]/bids/[bidId]/
   * unreject route for the safeguards on the server side.
   */
  static async unrejectBid(bidId: string, jobId: string): Promise<void> {
    if (!jobId) throw new Error('jobId is required to unreject a bid');
    await mobileApiClient.post(`/api/jobs/${jobId}/bids/${bidId}/unreject`);
  }

  static async withdrawBid(bidId: string, jobId: string): Promise<void> {
    if (!jobId) throw new Error('jobId is required to withdraw a bid');
    await mobileApiClient.post(`/api/jobs/${jobId}/bids/${bidId}/withdraw`);
  }

  static async updateBid(
    bidId: string,
    jobId: string,
    // 2026-05-26 audit-59 P2: previously the type listed
    // `estimated_duration` which the PATCH route doesn't accept;
    // callers passing it had the field silently dropped by the
    // route's non-strict schema. The canonical PATCH-accepted field
    // is `estimated_duration_days: number`. Re-typed accordingly;
    // BidSubmissionScreen edit-mode already POSTs the right key.
    updates: Partial<
      Pick<
        BidData,
        'amount' | 'message' | 'estimated_duration_days' | 'availability'
      >
    >
  ): Promise<Bid> {
    if (!jobId) throw new Error('jobId is required to update a bid');
    const response = await mobileApiClient.patch<{ bid: Bid }>(
      `/api/jobs/${jobId}/bids/${bidId}`,
      updates
    );
    return response.bid;
  }
}
