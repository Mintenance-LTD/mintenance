import { supabase } from '../config/supabase';

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
    // Validation
    if (bidData.amount <= 0) {
      throw new Error('Bid amount must be greater than 0');
    }
    
    if (!bidData.message.trim()) {
      throw new Error('Bid message is required');
    }

    if (bidData.availability && !/^\d{4}-\d{2}-\d{2}$/.test(bidData.availability)) {
      throw new Error('Invalid availability date format');
    }

    // Check if contractor is trying to bid on their own job
    const { data: job } = await supabase
      .from('jobs')
      .select('homeowner_id')
      .eq('id', bidData.job_id)
      .single();

    if (job?.homeowner_id === bidData.contractor_id) {
      throw new Error('Cannot bid on your own job');
    }

    const { data, error } = await supabase
      .from('bids')
      .insert([{
        ...bidData,
        status: 'pending'
      }])
      .select(`
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
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async getBidsByJob(jobId: string, status?: string): Promise<Bid[]> {
    let query = supabase
      .from('bids')
      .select(`
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
      `)
      .eq('job_id', jobId);

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
      .select(`
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
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async acceptBid(bidId: string, homeownerId: string): Promise<Bid> {
    // Verify authorization and bid status
    const { data: bid, error: fetchError } = await supabase
      .from('bids')
      .select(`
        *,
        job:job_id (homeowner_id)
      `)
      .eq('id', bidId)
      .single();

    if (fetchError) throw fetchError;
    
    if (bid.job.homeowner_id !== homeownerId) {
      throw new Error('Not authorized to accept this bid');
    }

    if (bid.status === 'accepted') {
      throw new Error('Bid has already been accepted');
    }

    // Accept the bid
    const { data, error } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId)
      .select()
      .single();

    if (error) throw error;

    // Reject other bids for the same job
    await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', bid.job_id)
      .neq('id', bidId);

    // Update job status to assigned
    await supabase
      .from('jobs')
      .update({ 
        status: 'assigned',
        contractor_id: bid.contractor_id
      })
      .eq('id', bid.job_id);

    return data;
  }

  static async rejectBid(bidId: string, homeownerId: string, reason?: string): Promise<Bid> {
    // Verify authorization
    const { data: bid } = await supabase
      .from('bids')
      .select(`
        *,
        job:job_id (homeowner_id)
      `)
      .eq('id', bidId)
      .single();

    if (bid?.job.homeowner_id !== homeownerId) {
      throw new Error('Not authorized to reject this bid');
    }

    const { data, error } = await supabase
      .from('bids')
      .update({ 
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', bidId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async withdrawBid(bidId: string, contractorId: string): Promise<void> {
    // Verify authorization
    const { data: bid } = await supabase
      .from('bids')
      .select('contractor_id, status')
      .eq('id', bidId)
      .single();

    if (bid?.contractor_id !== contractorId) {
      throw new Error('Not authorized to withdraw this bid');
    }

    if (bid.status === 'accepted') {
      throw new Error('Cannot withdraw an accepted bid');
    }

    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', bidId);

    if (error) throw error;
  }

  static async updateBid(
    bidId: string, 
    contractorId: string, 
    updates: Partial<Pick<BidData, 'amount' | 'message' | 'estimated_duration' | 'availability'>>
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

  static async getBidStatistics(jobId: string) : Promise<void> {
    const { data, error } = await supabase.functions.invoke('get-bid-statistics', {
      body: { jobId }
    });

    if (error) throw error;
    return data;
  }
}