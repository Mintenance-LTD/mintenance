import type { Job, Bid } from '../../types';

// ============================================================================
// JOB & BID MOCK FACTORY
// ============================================================================

export class JobBidMockFactory {
  // ============================================================================
  // JOB MOCKS
  // ============================================================================

  static createCompleteJob(overrides: Partial<Job> = {}): Job {
    const baseJob: Job = {
      id: 'job-123',
      title: 'Kitchen Faucet Repair',
      description: 'My kitchen faucet is leaking and needs repair',
      location: '123 Main St, Anytown, USA',
      homeowner_id: 'homeowner-123',
      status: 'posted' as const,
      budget: 200,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: 'Plumbing',
      priority: 'medium' as const,
      photos: [],
      ...overrides,
    };

    return baseJob;
  }

  static createPostedJob(overrides: Partial<Job> = {}): Job {
    return this.createCompleteJob({
      status: 'posted' as const,
      ...overrides,
    });
  }

  static createAssignedJob(overrides: Partial<Job> = {}): Job {
    return this.createCompleteJob({
      status: 'assigned' as const,
      contractor_id: 'contractor-456',
      ...overrides,
    });
  }

  static createInProgressJob(overrides: Partial<Job> = {}): Job {
    return this.createCompleteJob({
      status: 'in_progress' as const,
      contractor_id: 'contractor-456',
      ...overrides,
    });
  }

  static createCompletedJob(overrides: Partial<Job> = {}): Job {
    return this.createCompleteJob({
      status: 'completed' as const,
      contractor_id: 'contractor-456',
      ...overrides,
    });
  }

  static createJobArray(count: number = 3, overrides: Partial<Job> = {}): Job[] {
    return Array.from({ length: count }, (_, index) =>
      this.createCompleteJob({
        id: `job-${index + 1}`,
        title: `Job ${index + 1}`,
        budget: (index + 1) * 100,
        ...overrides,
      })
    );
  }

  // ============================================================================
  // BID MOCKS
  // ============================================================================

  static createCompleteBid(overrides: Partial<Bid> = {}): Bid {
    const baseBid: Bid = {
      id: 'bid-123',
      jobId: 'job-123',
      contractorId: 'contractor-456',
      amount: 180,
      description: 'I can fix your faucet quickly and professionally',
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      contractorName: 'Jane Smith',
      contractorEmail: 'jane@example.com',
      jobTitle: 'Kitchen Faucet Repair',
      jobDescription: 'My kitchen faucet is leaking and needs repair',
      jobLocation: '123 Main St, Anytown, USA',
      jobBudget: 200,
      ...overrides,
    };

    return baseBid;
  }

  static createPendingBid(overrides: Partial<Bid> = {}): Bid {
    return this.createCompleteBid({
      status: 'pending' as const,
      ...overrides,
    });
  }

  static createAcceptedBid(overrides: Partial<Bid> = {}): Bid {
    return this.createCompleteBid({
      status: 'accepted' as const,
      ...overrides,
    });
  }

  static createRejectedBid(overrides: Partial<Bid> = {}): Bid {
    return this.createCompleteBid({
      status: 'rejected' as const,
      ...overrides,
    });
  }

  static createBidArray(count: number = 3, overrides: Partial<Bid> = {}): Bid[] {
    return Array.from({ length: count }, (_, index) =>
      this.createCompleteBid({
        id: `bid-${index + 1}`,
        contractorId: `contractor-${index + 456}`,
        amount: 150 + (index * 25),
        description: `Bid description ${index + 1}`,
        ...overrides,
      })
    );
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  static createJobWithBids(jobOverrides: Partial<Job> = {}, bidCount: number = 2): {
    job: Job;
    bids: Bid[];
  } {
    const job = this.createCompleteJob(jobOverrides);
    const bids = this.createBidArray(bidCount, { jobId: job.id });

    return { job, bids };
  }

  static createContractorJobHistory(contractorId: string, count: number = 5): Job[] {
    return this.createJobArray(count, {
      contractor_id: contractorId,
      status: 'completed' as const,
    });
  }

  static createHomeownerJobHistory(homeownerId: string, count: number = 3): Job[] {
    return this.createJobArray(count, {
      homeowner_id: homeownerId,
    });
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const mockJob = JobBidMockFactory.createCompleteJob();
export const mockJobPosted = JobBidMockFactory.createPostedJob();
export const mockJobAssigned = JobBidMockFactory.createAssignedJob();
export const mockJobInProgress = JobBidMockFactory.createInProgressJob();
export const mockJobCompleted = JobBidMockFactory.createCompletedJob();

export const mockBid = JobBidMockFactory.createCompleteBid();
export const mockBidPending = JobBidMockFactory.createPendingBid();
export const mockBidAccepted = JobBidMockFactory.createAcceptedBid();
export const mockBidRejected = JobBidMockFactory.createRejectedBid();

export const mockJobs = JobBidMockFactory.createJobArray();
export const mockBids = JobBidMockFactory.createBidArray();

export default JobBidMockFactory;
