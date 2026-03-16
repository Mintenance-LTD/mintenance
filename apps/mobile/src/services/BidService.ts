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
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();
    const url = `/api/jobs/${jobId}/bids${query ? `?${query}` : ''}`;
    const response = await mobileApiClient.get<{ bids: Bid[] }>(url);
    return response.bids || [];
  }

  static async getBidsByJobs(jobIds: string[], status?: string): Promise<Bid[]> {
    if (jobIds.length === 0) return [];
    // Fetch bids for each job in parallel via the API
    const results = await Promise.all(
      jobIds.map((jobId) => BidService.getBidsByJob(jobId, status))
    );
    return results.flat().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const response = await mobileApiClient.get<{ bids: Bid[] }>(
      `/api/contractor/bids?contractorId=${contractorId}`
    );
    return response.bids || [];
  }

  static async acceptBid(bidId: string, _homeownerId: string): Promise<Bid> {
    // Fetch bid details via API to get job_id
    const bidResponse = await mobileApiClient.get<{ bids: Bid[] }>(
      `/api/contractor/bids?bidId=${bidId}`
    );
    const bid = bidResponse.bids?.[0];
    if (!bid) throw new Error('Bid not found');

    // Accept via API (creates contract, message thread, notifications)
    const response = await mobileApiClient.post<{ bid: Bid }>(
      `/api/jobs/${bid.job_id}/bids/${bidId}/accept`
    );
    return response.bid;
  }

  static async rejectBid(
    bidId: string,
    _homeownerId: string,
    reason?: string
  ): Promise<Bid> {
    // Fetch bid to get job_id
    const bidResponse = await mobileApiClient.get<{ bids: Bid[] }>(
      `/api/contractor/bids?bidId=${bidId}`
    );
    const bid = bidResponse.bids?.[0];
    if (!bid) throw new Error('Bid not found');

    const response = await mobileApiClient.post<{ bid: Bid }>(
      `/api/jobs/${bid.job_id}/bids/${bidId}/reject`,
      { reason }
    );
    return response.bid;
  }

  static async withdrawBid(bidId: string, _contractorId: string): Promise<void> {
    // Fetch bid to get job_id
    const bidResponse = await mobileApiClient.get<{ bids: Bid[] }>(
      `/api/contractor/bids?bidId=${bidId}`
    );
    const bid = bidResponse.bids?.[0];
    if (!bid) throw new Error('Bid not found');

    await mobileApiClient.post(`/api/jobs/${bid.job_id}/bids/${bidId}/withdraw`);
  }

  static async updateBid(
    bidId: string,
    _contractorId: string,
    updates: Partial<
      Pick<BidData, 'amount' | 'message' | 'estimated_duration' | 'availability'>
    >
  ): Promise<Bid> {
    // Fetch bid to get job_id
    const bidResponse = await mobileApiClient.get<{ bids: Bid[] }>(
      `/api/contractor/bids?bidId=${bidId}`
    );
    const bid = bidResponse.bids?.[0];
    if (!bid) throw new Error('Bid not found');

    const response = await mobileApiClient.patch<{ bid: Bid }>(
      `/api/jobs/${bid.job_id}/bids/${bidId}`,
      updates
    );
    return response.bid;
  }

  static async getBidStatistics(jobId: string): Promise<void> {
    const data = await mobileApiClient.get<void>(
      `/api/jobs/${jobId}/bid-statistics`
    );
    return data;
  }
}
