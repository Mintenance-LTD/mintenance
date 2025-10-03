/**
 * Job Service - Main Service
 * 
 * This is the main JobService that delegates to specialized services.
 * It maintains backward compatibility while using the new modular architecture.
 */

import { Job, Bid } from '../types';
import { JobCRUDService } from './JobCRUDService';
import { BidManagementService } from './BidManagementService';
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
    priority?: 'low' | 'medium' | 'high';
    photos?: string[];
  }): Promise<Job> {
    return JobCRUDService.createJob(jobData);
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    return JobCRUDService.getJobById(jobId);
  }

  static async updateJob(
    jobId: string,
    updates: Partial<Pick<Job, 'title' | 'description' | 'location' | 'budget' | 'status' | 'category' | 'subcategory' | 'priority'>>
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

  static async getJobs(arg1?: any, arg2?: any): Promise<Job[]> {
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

  static async getJobsByUser(userId: string, role: 'homeowner' | 'contractor'): Promise<Job[]> {
    return JobSearchService.getJobsByUser(userId, role);
  }

  // Bid operations - delegate to BidManagementService
  static async submitBid(bidData: {
    jobId: string;
    contractorId: string;
    amount: number;
    description: string;
  }): Promise<Bid> {
    return BidManagementService.submitBid(bidData);
  }

  static async getBidsByJob(jobId: string): Promise<Bid[]> {
    return BidManagementService.getBidsByJob(jobId);
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    return BidManagementService.getBidsByContractor(contractorId);
  }

  static async acceptBid(bidId: string): Promise<void> {
    return BidManagementService.acceptBid(bidId);
  }
}
