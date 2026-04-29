/**
 * Job Service - Main Service
 *
 * This is the main JobService that delegates to specialized services.
 * It maintains backward compatibility while using the new modular architecture.
 */

import type { Job, Bid as ApiBid } from '@mintenance/types';
import { JobCRUDService } from './JobCRUDService';
import { BidService, type Bid } from './BidService';
import { JobSearchService } from './JobSearchService';

export class JobService {
  // Job CRUD operations - delegate to JobCRUDService
  static async createJob(jobData: {
    title: string;
    description: string;
    location: string;
    budget: number;
    homeownerId?: string;
    homeowner_id?: string;
    category?: string;
    subcategory?: string;
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    photos?: string[];
    property_id?: string;
    latitude?: number;
    longitude?: number;
    // R6 #19 landlord / tenancy — optional forwarding
    is_rental_property?: boolean;
    tenancy_metadata?: Record<string, unknown>;
  }): Promise<Job> {
    return JobCRUDService.createJob(jobData);
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }

  static async updateJob(
    jobId: string,
    updates: Partial<
      Pick<
        Job,
        | 'title'
        | 'description'
        | 'location'
        | 'budget'
        | 'status'
        | 'category'
        | 'subcategory'
        | 'priority'
      >
    >
  ): Promise<Job> {
    return JobCRUDService.updateJob(jobId, updates);
  }

  static async deleteJob(jobId: string): Promise<void> {
    return JobCRUDService.deleteJob(jobId);
  }

  static async updateJobStatus(
    jobId: string,
    status: Job['status'],
    contractorId?: string
  ): Promise<Job> {
    return JobCRUDService.updateJobStatus(jobId, status, contractorId);
  }

  static async startJob(jobId: string): Promise<void> {
    return JobCRUDService.startJob(jobId);
  }

  static async completeJob(jobId: string): Promise<void> {
    return JobCRUDService.completeJob(jobId);
  }

  // Job search operations - delegate to JobSearchService
  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    return JobSearchService.getJobsByHomeowner(homeownerId);
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    return JobSearchService.getUserJobs(userId);
  }

  static async getAvailableJobs(): Promise<Job[]> {
    return JobSearchService.getAvailableJobs();
  }

  static async getJobsByStatus(
    status: Job['status'],
    userId?: string
  ): Promise<Job[]> {
    return JobSearchService.getJobsByStatus(status, userId);
  }

  static async getJobs(arg1?: unknown, arg2?: unknown): Promise<Job[]> {
    return JobSearchService.getJobs(arg1, arg2);
  }

  static async searchJobs(
    queryText: string,
    filters?: { category?: string; minBudget?: number; maxBudget?: number },
    limit: number = 20
  ): Promise<Job[]> {
    return JobSearchService.searchJobs(queryText, filters, limit);
  }

  static async getJob(jobId: string): Promise<Job | null> {
    return JobSearchService.getJob(jobId);
  }

  static async getJobsByUser(
    userId: string,
    role: 'homeowner' | 'contractor'
  ): Promise<Job[]> {
    return JobSearchService.getJobsByUser(userId, role);
  }

  // Bid operations - delegate to BidService (single public bid surface).
  // Returns ApiBid (camelCase flat) on submit since the rich-payload path
  // routes through /api/contractor/submit-bid which returns that shape.
  // Read paths return Bid (snake_case nested with contractor.rating +
  // reviews_count rolled up).
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
  }): Promise<ApiBid> {
    return BidService.submitBid(bidData);
  }

  static async getBidsByJob(jobId: string): Promise<Bid[]> {
    return BidService.getBidsByJob(jobId);
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    return BidService.getBidsByContractor(contractorId);
  }

  /**
   * Audit step 11 (2026-04-29): the underlying mutation routes are
   * nested under `/api/jobs/:jobId/bids/:bidId/accept`, so callers
   * must supply `jobId`. Every UI surface (BidReviewScreen +
   * ContractorAssignment via useAcceptBid) already has it in scope.
   */
  static async acceptBid(bidId: string, jobId: string): Promise<void> {
    await BidService.acceptBid(bidId, jobId);
  }
}
