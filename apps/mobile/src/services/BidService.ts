import { mobileApiClient } from '../utils/mobileApiClient';
import { supabase } from '../config/supabase';
import { BidManagementService } from './BidManagementService';

export interface BidData {
  job_id: string;
  contractor_id: string;
  amount: number;
  message: string;
  estimated_duration?: string;
  availability?: string;
}

export interface Bid extends BidData {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
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
   * Helper: fetch a bid's `job_id` so the mutation routes (which
   * are nested under `/api/jobs/[id]/bids/[bidId]`) can be called
   * with a bidId-only public surface.
   *
   * Last remaining direct-Supabase read in this service. Future
   * refactor (TODO): change `acceptBid / rejectBid / withdrawBid /
   * updateBid` to take an explicit `jobId` parameter — every caller
   * already has it in screen scope. Doing so removes this lookup
   * entirely, but cascades through `useAcceptBid`, the offline
   * action executor's `BidData` shape, and ~6 test files. Kept as
   * a single-row RLS-scoped read in the meantime so the audit's
   * "remove direct Supabase from product flows" goal is at 4-of-5
   * for BidService rather than blocked behind a 15-file cascade.
   */
  private static async getBidJobId(bidId: string): Promise<string> {
    const { data, error } = await supabase
      .from('bids')
      .select('job_id')
      .eq('id', bidId)
      .single();
    if (error || !data) throw new Error('Bid not found');
    return (data as { job_id: string }).job_id;
  }

  static async acceptBid(bidId: string, _homeownerId: string): Promise<Bid> {
    const jobId = await BidService.getBidJobId(bidId);

    // Accept via API (creates contract, message thread, notifications)
    const response = await mobileApiClient.post<{ bid: Bid }>(
      `/api/jobs/${jobId}/bids/${bidId}/accept`
    );
    return response.bid;
  }

  static async rejectBid(
    bidId: string,
    _homeownerId: string,
    reason?: string
  ): Promise<Bid> {
    const jobId = await BidService.getBidJobId(bidId);

    const response = await mobileApiClient.post<{ bid: Bid }>(
      `/api/jobs/${jobId}/bids/${bidId}/reject`,
      { reason }
    );
    return response.bid;
  }

  /**
   * Reverse a recent rejection (60-second server-side window). Fires
   * from the BidReview undo banner — see /api/jobs/[id]/bids/[bidId]/
   * unreject route for the safeguards on the server side.
   */
  static async unrejectBid(bidId: string, _homeownerId: string): Promise<void> {
    const jobId = await BidService.getBidJobId(bidId);
    await mobileApiClient.post(`/api/jobs/${jobId}/bids/${bidId}/unreject`);
  }

  static async withdrawBid(
    bidId: string,
    _contractorId: string
  ): Promise<void> {
    const jobId = await BidService.getBidJobId(bidId);
    await mobileApiClient.post(`/api/jobs/${jobId}/bids/${bidId}/withdraw`);
  }

  static async updateBid(
    bidId: string,
    _contractorId: string,
    updates: Partial<
      Pick<
        BidData,
        'amount' | 'message' | 'estimated_duration' | 'availability'
      >
    >
  ): Promise<Bid> {
    const jobId = await BidService.getBidJobId(bidId);

    const response = await mobileApiClient.patch<{ bid: Bid }>(
      `/api/jobs/${jobId}/bids/${bidId}`,
      updates
    );
    return response.bid;
  }
}
