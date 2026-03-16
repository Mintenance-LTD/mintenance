import { supabase } from '../config/supabase';
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
  static async createBid(bidData: BidData): Promise<Bid> {
    // Client-side validation for quick UX feedback
    if (bidData.amount <= 0) {
      throw new Error('Bid amount must be greater than 0');
    }
    if (!bidData.message.trim()) {
      throw new Error('Bid message is required');
    }

    // Delegate to BidManagementService which routes through web API
    const result = await BidManagementService.submitBid({
      jobId: bidData.job_id,
      contractorId: bidData.contractor_id,
      amount: bidData.amount,
      description: bidData.message,
    });

    // Return in BidService's Bid format
    return {
      ...bidData,
      id: result.id,
      status: result.status as Bid['status'],
      created_at: result.createdAt,
      updated_at: result.createdAt,
    };
  }

  static async getBidsByJob(jobId: string, status?: string): Promise<Bid[]> {
    let query = supabase
      .from('bids')
      .select(
        `
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          email,
          rating,
          reviews_count,
          profile_picture
        )
      `
      )
      .eq('job_id', jobId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  }

  /** Batch fetch bids for multiple jobs in a single query (avoids N+1). */
  static async getBidsByJobs(jobIds: string[], status?: string): Promise<Bid[]> {
    if (jobIds.length === 0) return [];
    let query = supabase
      .from('bids')
      .select(
        `*,
        contractor:contractor_id (
          id, first_name, last_name, email, rating, reviews_count, profile_picture
        ),
        job:job_id (
          id, title, description, budget, category, status, location, created_at
        )`
      )
      .in('job_id', jobIds);
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(
        `
        *,
        job:job_id (
          id,
          title,
          description,
          budget,
          category,
          status,
          location,
          created_at
        )
      `
      )
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async acceptBid(bidId: string, homeownerId: string): Promise<Bid> {
    // Fetch the bid to get job_id for the API URL
    const { data: bid, error: fetchError } = await supabase
      .from('bids')
      .select('*, job:job_id (homeowner_id)')
      .eq('id', bidId)
      .single();

    if (fetchError) throw fetchError;
    if (!bid) throw new Error('Bid not found');

    if (bid.job.homeowner_id !== homeownerId) {
      throw new Error('Not authorized to accept this bid');
    }

    // Route through web API to ensure contract, message thread, and notifications are created
    await mobileApiClient.post(`/api/jobs/${bid.job_id}/bids/${bidId}/accept`);

    // Return the updated bid data
    const { data: updatedBid, error: refetchError } = await supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .single();

    if (refetchError) throw refetchError;
    return updatedBid;
  }

  static async rejectBid(
    bidId: string,
    _homeownerId: string,
    reason?: string
  ): Promise<Bid> {
    // Fetch the bid to get job_id for the API URL
    const { data: bid } = await supabase
      .from('bids')
      .select('job_id')
      .eq('id', bidId)
      .single();

    if (!bid) throw new Error('Bid not found');

    // Route through web API for permission checks, notifications, and audit logging
    const response = await mobileApiClient.post<{ bid: Bid }>(
      `/api/jobs/${bid.job_id}/bids/${bidId}/reject`,
      { reason }
    );

    return response.bid;
  }

  static async withdrawBid(bidId: string, _contractorId: string): Promise<void> {
    // Fetch the bid to get job_id for the API URL
    const { data: bid } = await supabase
      .from('bids')
      .select('job_id')
      .eq('id', bidId)
      .single();

    if (!bid) throw new Error('Bid not found');

    // Route through web API for permission checks, status validation (sets 'withdrawn' not delete),
    // notifications, and audit logging
    await mobileApiClient.post(`/api/jobs/${bid.job_id}/bids/${bidId}/withdraw`);
  }

  static async updateBid(
    bidId: string,
    contractorId: string,
    updates: Partial<
      Pick<
        BidData,
        'amount' | 'message' | 'estimated_duration' | 'availability'
      >
    >
  ): Promise<Bid> {
    // Verify authorization
    const { data: bid } = await supabase
      .from('bids')
      .select('contractor_id, status')
      .eq('id', bidId)
      .single();

    if (bid?.contractor_id !== contractorId) {
      throw new Error('Not authorized to update this bid');
    }

    if (bid.status !== 'pending') {
      throw new Error('Cannot update a bid that is not pending');
    }

    const { data, error } = await supabase
      .from('bids')
      .update(updates)
      .eq('id', bidId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getBidStatistics(jobId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke(
      'get-bid-statistics',
      {
        body: { jobId },
      }
    );

    if (error) throw error;
    return data;
  }
}
