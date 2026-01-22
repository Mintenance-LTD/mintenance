/**
 * Bid Service - Core business logic for bid operations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { BidValidator } from './BidValidator';
import { BidRepository } from './BidRepository';
import { BidRecord, BidDetail, SubmitBidData, BidListParams, BidStatus } from './types';

interface User {
  id: string;
  email: string;
  role: string;
}

interface Contract {
  id: string;
  job_id: string;
  bid_id: string;
  contractor_id: string;
  homeowner_id: string;
  amount: number;
  status: string;
  [key: string]: any;
}

export interface BidServiceConfig {
  supabase: SupabaseClient;
}

export class BidService {
  private validator: BidValidator;
  private repository: BidRepository;
  private supabase: SupabaseClient;

  constructor(config: BidServiceConfig) {
    this.supabase = config.supabase;
    this.validator = new BidValidator();
    this.repository = new BidRepository(config.supabase);
  }

  /**
   * Submit a new bid
   */
  async submitBid(data: SubmitBidData, contractor: User): Promise<BidRecord> {
    // Validate bid data
    const validatedData = this.validator.validateSubmitBid(data);

    // Check if job exists and is accepting bids
    const job = await this.repository.getJob(validatedData.jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    if (job.status !== 'posted') {
      throw new Error('Job is not accepting bids');
    }

    // Check if contractor already bid on this job
    const existingBid = await this.repository.getContractorBidForJob(
      validatedData.jobId,
      contractor.id
    );
    if (existingBid) {
      throw new Error('You have already submitted a bid for this job');
    }

    // Check contractor qualifications
    await this.validateContractorQualifications(contractor.id, job);

    // Calculate duration in hours for consistent storage
    const durationInHours = this.convertDurationToHours(
      validatedData.estimatedDuration,
      validatedData.estimatedDurationUnit
    );

    // Create bid record
    const bidData = {
      job_id: validatedData.jobId,
      contractor_id: contractor.id,
      amount: validatedData.bidAmount,
      proposal_text: validatedData.proposalText,
      estimated_duration: durationInHours,
      estimated_duration_unit: 'hours',
      proposed_start_date: validatedData.proposedStartDate,
      status: 'pending' as BidStatus,
      materials_cost: validatedData.materialsCost,
      labor_cost: validatedData.laborCost,
      availability: validatedData.availability,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bid = await this.repository.createBid(bidData);

    // Store itemized quote if provided
    if (validatedData.itemizedQuote?.length) {
      await this.repository.createItemizedQuote(bid.id, validatedData.itemizedQuote);
    }

    // Store attachments if provided
    if (validatedData.attachments?.length) {
      await this.repository.createBidAttachments(bid.id, validatedData.attachments);
    }

    // Update job bid count
    await this.repository.incrementJobBidCount(validatedData.jobId);

    logger.info('Bid submitted successfully', {
      bidId: bid.id,
      jobId: validatedData.jobId,
      contractorId: contractor.id,
      amount: validatedData.bidAmount
    });

    return bid;
  }

  /**
   * Get bids for a contractor
   */
  async getContractorBids(contractorId: string, params: BidListParams): Promise<any> {
    const query = this.repository.buildBidsQuery({
      contractorId,
      ...params
    });

    const { data, count } = await query;
    return {
      bids: (data as any) as BidRecord[] || [],
      total: count || 0,
      hasMore: (count || 0) > params.offset + params.limit
    };
  }

  /**
   * Get bids for a job (homeowner view)
   */
  async getJobBids(jobId: string, homeownerId: string, params: BidListParams): Promise<any> {
    // Verify homeowner owns the job
    const job = await this.repository.getJob(jobId);
    if (!job || job.homeowner_id !== homeownerId) {
      throw new Error('Unauthorized to view bids for this job');
    }

    const query = this.repository.buildBidsQuery({
      jobId,
      ...params,
      includeContractorDetails: true
    });

    const { data, count } = await query;
    const bids = (data as any) as BidRecord[] || [];

    // Enrich bids with scoring and ranking
    const enrichedBids = await this.enrichBidsWithScoring(bids);

    return {
      bids: enrichedBids,
      total: count || 0,
      hasMore: (count || 0) > params.offset + params.limit,
      averageBid: this.calculateAverageBid(enrichedBids),
      lowestBid: this.findLowestBid(enrichedBids),
      highestBid: this.findHighestBid(enrichedBids)
    };
  }

  /**
   * Get single bid with authorization check
   */
  async getBidById(bidId: string, user: User): Promise<BidDetail | null> {
    const bid = await this.repository.getBidById(bidId);
    if (!bid) {
      return null;
    }

    // Check authorization
    const canView = await this.canViewBid(bid, user);
    if (!canView) {
      throw new Error('Unauthorized to view this bid');
    }

    // Get additional details
    const [itemizedQuote, attachments, bidWithJob] = await Promise.all([
      this.repository.getItemizedQuote(bidId),
      this.repository.getBidAttachments(bidId),
      this.repository.getBidWithJob(bidId)
    ]);

    return {
      ...bid,
      itemizedQuote,
      attachments,
      job: (bidWithJob as any).job
    } as BidDetail;
  }

  /**
   * Accept a bid and create a contract
   */
  async acceptBid(bidId: string, homeowner: User): Promise<{ bid: BidRecord; contract: Contract }> {
    // Get bid with job details
    const bidWithJob = await this.repository.getBidWithJob(bidId);
    if (!bidWithJob) {
      throw new Error('Bid not found');
    }

    if ((bidWithJob as any).job.homeowner_id !== homeowner.id) {
      throw new Error('Unauthorized to accept this bid');
    }
    if (bidWithJob.status !== 'pending') {
      throw new Error('Bid is no longer available for acceptance');
    }
    if ((bidWithJob as any).job.status !== 'posted') {
      throw new Error('Job is no longer accepting bids');
    }

    // Accept bid using RPC or complex transaction logic
    // For now simple repository calls
    const updatedBid = await this.repository.updateBidStatus(bidId, 'accepted');
    const contract = await this.repository.getContractByBidId(bidId);

    // Update job status and contractor
    await this.repository.updateJobStatus(bidWithJob.job_id, 'in_progress', bidWithJob.contractor_id);

    // Reject other pending bids
    await this.repository.rejectOtherBids(bidWithJob.job_id, bidId);

    logger.info('Bid accepted and contract created', {
      bidId,
      jobId: bidWithJob.job_id
    });

    return { bid: updatedBid, contract };
  }

  /**
   * Reject a bid
   */
  async rejectBid(bidId: string, homeowner: User, reason?: string): Promise<BidRecord> {
    const bidWithJob = await this.repository.getBidWithJob(bidId);
    if (!bidWithJob) {
      throw new Error('Bid not found');
    }

    if ((bidWithJob as any).job.homeowner_id !== homeowner.id) {
      throw new Error('Unauthorized to reject this bid');
    }

    if (bidWithJob.status !== 'pending') {
      throw new Error('Bid has already been processed');
    }

    const updatedBid = await this.repository.updateBidStatus(bidId, 'rejected', reason);
    logger.info('Bid rejected', { bidId, reason });
    return updatedBid;
  }

  /**
   * Update a bid (before acceptance)
   */
  async updateBid(bidId: string, data: Partial<SubmitBidData>, contractor: User): Promise<BidRecord> {
    const bid = await this.repository.getBidById(bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    if (bid.contractor_id !== contractor.id) {
      throw new Error('Unauthorized to update this bid');
    }

    if (bid.status !== 'pending') {
      throw new Error('Cannot update bid after it has been processed');
    }

    const validatedData = this.validator.validateUpdateBid(data);
    const updateData: any = { ...validatedData };

    if (validatedData.estimatedDuration && validatedData.estimatedDurationUnit) {
      updateData.estimated_duration = this.convertDurationToHours(
        validatedData.estimatedDuration,
        validatedData.estimatedDurationUnit
      );
    }

    const updatedBid = await this.repository.updateBid(bidId, updateData);

    if (validatedData.itemizedQuote) {
      await this.repository.updateItemizedQuote(bidId, validatedData.itemizedQuote);
    }

    logger.info('Bid updated', { bidId });
    return updatedBid;
  }

  /**
   * Withdraw a bid
   */
  async withdrawBid(bidId: string, contractor: User): Promise<void> {
    const bid = await this.repository.getBidById(bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    if (bid.contractor_id !== contractor.id) {
      throw new Error('Unauthorized to withdraw this bid');
    }

    if (bid.status === 'accepted') {
      throw new Error('Cannot withdraw an accepted bid');
    }

    await this.repository.updateBidStatus(bidId, 'withdrawn');
    await this.repository.decrementJobBidCount(bid.job_id);
    logger.info('Bid withdrawn', { bidId });
  }

  // ============= Private Helper Methods =============

  private async validateContractorQualifications(contractorId: string, job: any): Promise<void> {
    const contractor = await this.repository.getContractor(contractorId);
    if (!contractor.is_verified) {
      throw new Error('Only verified contractors can submit bids');
    }

    if (job.required_licenses?.length) {
      const hasRequiredLicenses = await this.repository.checkContractorLicenses(
        contractorId,
        job.required_licenses
      );
      if (!hasRequiredLicenses) {
        throw new Error('You do not have the required licenses for this job');
      }
    }

    if (job.latitude && job.longitude) {
      const isInServiceArea = await this.repository.checkContractorServiceArea(
        contractorId,
        job.latitude,
        job.longitude
      );
      if (!isInServiceArea) {
        throw new Error('This job is outside your service area');
      }
    }
  }

  private convertDurationToHours(duration: number, unit: 'hours' | 'days' | 'weeks' | 'months'): number {
    switch (unit) {
      case 'hours': return duration;
      case 'days': return duration * 8;
      case 'weeks': return duration * 40;
      case 'months': return duration * 160;
      default: return duration;
    }
  }

  private async canViewBid(bid: BidRecord, user: User): Promise<boolean> {
    if (bid.contractor_id === user.id) return true;
    if (user.role === 'admin') return true;

    const job = await this.repository.getJob(bid.job_id);
    return !!(job && job.homeowner_id === user.id);
  }

  private async enrichBidsWithScoring(bids: BidRecord[]): Promise<BidRecord[]> {
    return bids.sort((a, b) => {
      if (a.score && b.score) return b.score - a.score;
      return a.amount - b.amount;
    });
  }

  private calculateAverageBid(bids: BidRecord[]): number {
    if (bids.length === 0) return 0;
    return bids.reduce((sum, bid) => sum + bid.amount, 0) / bids.length;
  }

  private findLowestBid(bids: BidRecord[]): BidRecord | null {
    if (bids.length === 0) return null;
    return bids.reduce((lowest, bid) => bid.amount < lowest.amount ? bid : lowest);
  }

  private findHighestBid(bids: BidRecord[]): BidRecord | null {
    if (bids.length === 0) return null;
    return bids.reduce((highest, bid) => bid.amount > highest.amount ? bid : highest);
  }
}