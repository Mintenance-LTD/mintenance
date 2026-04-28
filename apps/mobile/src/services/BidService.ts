import { mobileApiClient } from '../utils/mobileApiClient';
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

  static async getBidsByJob(jobId: string, status?: string): Promise<Bid[]> {
    const { supabase } = await import('../config/supabase');
    let query = supabase
      .from('bids')
      .select(
        `
        id, job_id, contractor_id, amount, description, message, status,
        estimated_duration_days, materials_included, warranty_months,
        created_at, updated_at,
        contractor:profiles!bids_contractor_id_fkey(
          id, first_name, last_name, email, profile_image_url,
          company_name, city, bio, hourly_rate, years_experience,
          rating, total_jobs_completed
        )
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const bids = (data ?? []) as unknown as Bid[];

    // Attach reviews_count per contractor so BidReviewCard can render
    // "4.5 ★ (12 reviews)". profiles has `rating` but no aggregate
    // count column, so we roll up public.reviews in one extra query.
    const contractorIds = Array.from(
      new Set(bids.map((b) => b.contractor_id).filter(Boolean))
    );
    if (contractorIds.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('reviewee_id, rating')
        .in('reviewee_id', contractorIds);
      const counts = new Map<string, number>();
      const ratingTotals = new Map<string, number>();
      for (const row of reviewRows ?? []) {
        const review = row as {
          reviewee_id: string | null;
          rating: number | null;
        };
        const id = review.reviewee_id;
        if (!id) continue;

        counts.set(id, (counts.get(id) || 0) + 1);
        if (typeof review.rating === 'number') {
          ratingTotals.set(id, (ratingTotals.get(id) || 0) + review.rating);
        }
      }
      for (const bid of bids) {
        if (bid.contractor && bid.contractor_id) {
          const count = counts.get(bid.contractor_id) || 0;
          const aggregateRating =
            count > 0 ? (ratingTotals.get(bid.contractor_id) || 0) / count : 0;
          const contractor = bid.contractor as unknown as {
            reviews_count?: number;
            rating?: number | null;
          };
          contractor.reviews_count = count;
          if (!contractor.rating && aggregateRating > 0) {
            contractor.rating = Number(aggregateRating.toFixed(1));
          }
        }
      }
    }

    return bids;
  }

  static async getBidsByJobs(
    jobIds: string[],
    status?: string
  ): Promise<Bid[]> {
    if (jobIds.length === 0) return [];
    const { supabase } = await import('../config/supabase');
    let query = supabase
      .from('bids')
      .select(
        `
        id, job_id, contractor_id, amount, description, message, status,
        created_at, updated_at,
        contractor:profiles!bids_contractor_id_fkey(
          id, first_name, last_name, email, profile_image_url, company_name
        ),
        job:jobs!job_id(id, title)
`
      )
      .in('job_id', jobIds)
      .order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Bid[];
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const { supabase } = await import('../config/supabase');
    const { data, error } = await supabase
      .from('bids')
      .select(
        `
        id, job_id, contractor_id, amount, description, message, status,
        created_at, updated_at,
        job:jobs!bids_job_id_fkey(id, title, category, status, budget, location, created_at)
      `
      )
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Bid[];
  }

  /** Helper: fetch a bid's job_id via direct Supabase query (read-only). */
  private static async getBidJobId(bidId: string): Promise<string> {
    const { supabase } = await import('../config/supabase');
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

  // TODO: unused — consider removing
  static async getBidStatistics(jobId: string): Promise<number> {
    const { supabase } = await import('../config/supabase');
    const { count, error } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}
