/**
 * Bid Management Service
 * 
 * Handles all bidding-related operations:
 * - Submitting bids
 * - Getting bids by job/contractor
 * - Accepting/rejecting bids
 */

import { supabase } from '../config/supabase';
import { Bid } from '@mintenance/types';
import { mobileApiClient } from '../utils/mobileApiClient';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';

/**
 * Database row interface for bids table
 */
interface DatabaseBidsRow {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  contractor?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  job?: {
    title?: string;
    description?: string;
    location?: string;
    budget?: number;
  };
}

export class BidManagementService {
  static async submitBid(bidData: {
    jobId: string;
    contractorId: string;
    amount: number;
    description: string;
    estimatedDurationDays?: number;
  }): Promise<Bid> {
    // Default bid expiry: 14 days from submission
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { data, error } = await supabase
      .from('bids')
      .insert([
        {
          job_id: bidData.jobId,
          contractor_id: bidData.contractorId,
          amount: bidData.amount,
          message: bidData.description,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          ...(bidData.estimatedDurationDays && { estimated_duration_days: bidData.estimatedDurationDays }),
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
    // Fetch bid to get job_id for the API URL
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('job_id, contractor_id')
      .eq('id', bidId)
      .single();

    if (bidError) {
      if (bidError && typeof bidError === 'object' && 'message' in bidError) {
        throw new Error(String(bidError.message) || 'Bid fetch failed');
      } else {
        throw new Error('Bid fetch failed');
      }
    }
    if (!bid) throw new Error('Bid not found');

    // Route through web API to ensure contract, message thread, and notifications are created
    await mobileApiClient.post(`/api/jobs/${bid.job_id}/bids/${bidId}/accept`);
  }

  // Helper method
  private static formatBid(data: DatabaseBidsRow): Bid {
    return {
      id: data.id,
      jobId: data.job_id,
      contractorId: data.contractor_id,
      amount: data.amount,
      description: data.message,
      createdAt: data.created_at,
      status: data.status,
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
