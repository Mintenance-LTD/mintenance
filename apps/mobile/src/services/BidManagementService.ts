/**
 * Bid Management Service — INTERNAL HELPER for the rich-payload
 * /api/contractor/submit-bid call only.
 *
 * The read methods (getBidsByJob, getBidsByContractor) and the
 * client-side acceptBid that previously lived here have been removed:
 * they discarded contractor rating / profile fields in `formatBid`,
 * and after the BidService consolidation no production code reached
 * them. `BidService` is the only public bid surface — its read paths
 * return the snake_case + nested-contractor shape every consumer
 * needs.
 */

import { Bid } from '@mintenance/types';
import { mobileApiClient } from '../utils/mobileApiClient';

/**
 * Database row interface for bids table — return shape from
 * /api/contractor/submit-bid.
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
    proposedStartDate?: string;
    lineItems?: Array<{
      description: string;
      type: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount?: number;
    terms?: string;
  }): Promise<Bid> {
    // Route through web API for server-side validation, subscription checks, and notifications
    // Field names must match backend validation schema (validation.ts)
    const payload: Record<string, unknown> = {
      jobId: bidData.jobId,
      bidAmount: bidData.amount,
      proposalText: bidData.description,
      estimatedDuration: bidData.estimatedDurationDays,
      proposedStartDate: bidData.proposedStartDate,
    };
    // Quote fields — auto-creates a contractor_quotes record on the backend
    if (bidData.lineItems) payload.lineItems = bidData.lineItems;
    if (bidData.subtotal != null) payload.subtotal = bidData.subtotal;
    if (bidData.taxRate != null) payload.taxRate = bidData.taxRate;
    if (bidData.taxAmount != null) payload.taxAmount = bidData.taxAmount;
    if (bidData.totalAmount != null) payload.totalAmount = bidData.totalAmount;
    if (bidData.terms) payload.terms = bidData.terms;
    const response = await mobileApiClient.post<{ bid: DatabaseBidsRow }>(
      '/api/contractor/submit-bid',
      payload
    );

    if (!response.bid) {
      throw new Error('No bid returned from API');
    }

    return this.formatBid(response.bid);
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
      ...(data.contractor &&
        data.contractor.first_name &&
        data.contractor.last_name && {
          contractorName: `${data.contractor.first_name} ${data.contractor.last_name}`,
          contractorEmail: data.contractor.email || '',
        }),
      ...(data.job &&
        data.job.title && {
          jobTitle: data.job.title,
          jobDescription: data.job.description || '',
          jobLocation: data.job.location || '',
          jobBudget: data.job.budget || 0,
        }),
    };
  }
}
