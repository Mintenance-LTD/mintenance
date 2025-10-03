/**
 * Bid Management Service
 * 
 * Handles all bidding-related operations:
 * - Submitting bids
 * - Getting bids by job/contractor
 * - Accepting/rejecting bids
 */

import { supabase } from '../config/supabase';
import { Bid } from '../types';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';

export class BidManagementService {
  static async submitBid(bidData: {
    jobId: string;
    contractorId: string;
    amount: number;
    description: string;
  }): Promise<Bid> {
    const { data, error } = await supabase
      .from('bids')
      .insert([
        {
          job_id: bidData.jobId,
          contractor_id: bidData.contractorId,
          amount: bidData.amount,
          description: bidData.description,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.formatBid(data);
  }

  static async getBidsByJob(jobId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(
        `
        *,
        contractor:users(first_name, last_name, email)
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return data.map(this.formatBid);
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(
        `
        *,
        job:jobs(title, description, location, budget)
      `
      )
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return data.map(this.formatBid);
  }

  static async acceptBid(bidId: string): Promise<void> {
    // Start transaction
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('job_id, contractor_id')
      .eq('id', bidId)
      .single();

    if (bidError) throw new Error((bidError as any)?.message || 'Bid fetch failed');
    if (!bid) throw new Error('Bid not found');

    // Accept the bid
    const { error: updateBidError } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (updateBidError) throw updateBidError;

    // Update job status and assign contractor
    const { error: updateJobError } = await supabase
      .from('jobs')
      .update({
        status: 'assigned',
        contractor_id: bid.contractor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bid.job_id);

    if (updateJobError) throw updateJobError;

    // Reject other bids
    const { error: rejectBidsError } = await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', bid.job_id)
      .neq('id', bidId);

    if (rejectBidsError) throw rejectBidsError;
  }

  // Helper method
  private static formatBid(data: any): Bid {
    if (!data) {
      throw new Error('Bid data cannot be null or undefined');
    }
    
    return {
      id: data.id || '',
      jobId: data.job_id || '',
      contractorId: data.contractor_id || '',
      amount: data.amount || 0,
      description: data.description || '',
      createdAt: data.created_at || new Date().toISOString(),
      status: data.status || 'pending',
      ...(data.contractor && data.contractor.first_name && data.contractor.last_name && {
        contractorName: `${data.contractor.first_name} ${data.contractor.last_name}`,
        contractorEmail: data.contractor.email || '',
      }),
      ...(data.job && data.job.title && {
        jobTitle: data.job.title,
        jobDescription: data.job.description || '',
        jobLocation: data.job.location || '',
        jobBudget: data.job.budget || 0,
      }),
    };
  }
}
