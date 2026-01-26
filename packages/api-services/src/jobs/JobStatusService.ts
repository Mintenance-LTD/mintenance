/**
 * Job Status Service - Handles job status transitions and validations
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { JobRepository } from './JobRepository';
import { JobStatus, JobDetail } from './types';
import { User } from '../users';

// Status transition rules
const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['posted', 'cancelled'],
  posted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
  deleted: [],   // Terminal state
};

// Role-based status permissions
const ROLE_STATUS_PERMISSIONS: Record<string, Record<Partial<JobStatus>, JobStatus[]>> = {
  homeowner: {
    draft: ['posted', 'cancelled'],
    posted: ['cancelled'],
    in_progress: ['cancelled'],
    completed: [],
    cancelled: [],
    deleted: [],
  },
  contractor: {
    draft: [],
    posted: [],
    in_progress: ['completed'],
    completed: [],
    cancelled: [],
    deleted: [],
  },
  admin: {
    // Admin can make any valid transition
    draft: ['posted', 'cancelled'],
    posted: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['in_progress'], // Admin can revert
    cancelled: ['draft'], // Admin can restore
    deleted: ['draft'],   // Admin can restore
  },
};

export interface JobStatusServiceConfig {
  supabase: SupabaseClient;
  enableNotifications?: boolean;
}

export class JobStatusService {
  private repository: JobRepository;
  private config: JobStatusServiceConfig;

  constructor(config: JobStatusServiceConfig) {
    this.config = config;
    this.repository = new JobRepository(config.supabase);
  }

  /**
   * Update job status with validation
   */
  async updateJobStatus(
    jobId: string,
    newStatus: JobStatus,
    user: User,
    reason?: string
  ): Promise<JobDetail> {
    // Get current job
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const currentStatus = job.status as JobStatus;

    // Validate status transition
    this.validateStatusTransition(currentStatus, newStatus, user, job);

    // Check business rules for status change
    await this.checkBusinessRules(job, newStatus, user);

    // Prepare update data
    const updateData: unknown = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Add status change metadata
    if (reason) {
      updateData.status_change_reason = reason;
    }

    // Handle specific status transitions
    switch (newStatus) {
      case 'posted':
        updateData.posted_at = new Date().toISOString();
        break;
      case 'in_progress':
        updateData.started_at = new Date().toISOString();
        if (!job.contractor_id && user.role === 'contractor') {
          updateData.contractor_id = user.id;
        }
        break;
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        updateData.completion_confirmed_by = user.id;
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user.id;
        updateData.cancellation_reason = reason || 'No reason provided';
        break;
    }

    // Update the job
    const updatedJob = await this.repository.updateJob(jobId, updateData);

    // Log status change
    await this.logStatusChange(jobId, currentStatus, newStatus, user, reason);

    // Handle side effects
    await this.handleStatusChangeSideEffects(job, newStatus, user);

    // Map to JobDetail - note that mapToJobDetail is in JobService, 
    // but JobStatusService uses JobRepository directly.
    // We'll return a minimal JobDetail or fetch it properly.
    // For now, let's keep it simple as the existing implementation does.
    return updatedJob as unknown as JobDetail;
  }

  /**
   * Handle notifications for status changes
   */
  async handleStatusChangeNotifications(
    jobId: string,
    newStatus: JobStatus,
    user: User
  ): Promise<void> {
    if (!this.config.enableNotifications) {
      return;
    }

    const job = await this.repository.getJob(jobId);
    if (!job) {
      return;
    }

    // Determine who to notify based on status change
    const notifications: Array<{ userId: string; type: string; data: Record<string, unknown> }> = [];

    switch (newStatus) {
      case 'posted':
        // Notify relevant contractors
        const nearbyContractors = await this.repository.getNearbyContractors(
          (job.latitude || 0),
          (job.longitude || 0),
          50 // 50 mile radius
        );
        nearbyContractors.forEach(contractorId => {
          notifications.push({
            userId: contractorId,
            type: 'new_job_posted',
            data: { jobId, title: job.title, location: job.location }
          });
        });
        break;
      case 'in_progress':
        // Notify homeowner that job has started
        if (user.role === 'contractor') {
          notifications.push({
            userId: job.homeowner_id,
            type: 'job_started',
            data: { jobId, title: job.title, contractorId: user.id }
          });
        }
        break;
      case 'completed':
        // Notify homeowner to confirm completion
        notifications.push({
          userId: job.homeowner_id,
          type: 'job_completed',
          data: { jobId, title: job.title }
        });
        break;
      case 'cancelled':
        // Notify affected parties
        if (job.contractor_id && job.contractor_id !== user.id) {
          notifications.push({
            userId: job.contractor_id,
            type: 'job_cancelled',
            data: { jobId, title: job.title, reason: (job as any).cancellation_reason }
          });
        }
        // Notify bidders
        const bidders = await this.repository.getBiddersForJob(jobId);
        bidders.forEach(bidderId => {
          if (bidderId !== user.id) {
            notifications.push({
              userId: bidderId,
              type: 'job_cancelled',
              data: { jobId, title: job.title }
            });
          }
        });
        break;
    }

    // Send notifications
    if (notifications.length > 0) {
      await this.sendNotifications(notifications);
    }
  }

  /**
   * Check if a status transition is valid
   */
  isValidTransition(from: JobStatus, to: JobStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) || false;
  }

  /**
   * Get available status transitions for a job
   */
  getAvailableTransitions(job: unknown, user: User): JobStatus[] {
    const currentStatus = job.status as JobStatus;
    const userRole = user.role;

    // Get role-based permissions
    const rolePermissions = ROLE_STATUS_PERMISSIONS[userRole]?.[currentStatus] || [];

    // Get system-allowed transitions
    const systemTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    // Intersection of role permissions and system transitions
    const availableTransitions = rolePermissions.filter(status =>
      systemTransitions.includes(status)
    );

    // Additional business logic filters
    return this.filterByBusinessRules(job, availableTransitions, user);
  }

  // ============= Private Helper Methods =============

  private validateStatusTransition(
    from: JobStatus,
    to: JobStatus,
    user: User,
    job: unknown
  ): void {
    // Check if transition is valid
    if (!this.isValidTransition(from, to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`);
    }

    // Check role permissions
    const rolePermissions = ROLE_STATUS_PERMISSIONS[user.role]?.[from] || [];
    if (!rolePermissions.includes(to) && user.role !== 'admin') {
      throw new Error(`User role ${user.role} cannot change status from ${from} to ${to}`);
    }

    // Check ownership
    if (user.role === 'homeowner' && job.homeowner_id !== user.id) {
      throw new Error('Only the job owner can change this status');
    }

    if (user.role === 'contractor' && to === 'completed') {
      if (job.contractor_id !== user.id) {
        throw new Error('Only the assigned contractor can mark job as completed');
      }
    }
  }

  private async checkBusinessRules(
    job: unknown,
    newStatus: JobStatus,
    user: User
  ): Promise<void> {
    switch (newStatus) {
      case 'posted':
        // Check if job has required fields
        if (!job.title || !job.description) {
          throw new Error('Job must have title and description to be posted');
        }
        break;
      case 'in_progress':
        // Check if there's an accepted bid or assigned contractor
        if (!job.contractor_id) {
          const acceptedBid = await this.repository.getAcceptedBidForJob(job.id);
          if (!acceptedBid) {
            throw new Error('Job must have an accepted bid or assigned contractor');
          }
        }
        break;
      case 'completed':
        // Check if job was actually in progress
        if (job.status !== 'in_progress') {
          throw new Error('Only jobs in progress can be marked as completed');
        }
        // Check if there are any pending payments
        const hasPendingPayments = await this.repository.hasPendingPayments(job.id);
        if (hasPendingPayments) {
          throw new Error('Job has pending payments and cannot be marked as completed');
        }
        break;
      case 'cancelled':
        // Check if job can be cancelled
        if (job.status === 'completed') {
          throw new Error('Completed jobs cannot be cancelled');
        }
        // Check for active payments
        const hasActivePayments = await this.repository.hasActivePayments(job.id);
        if (hasActivePayments) {
          throw new Error('Job has active payments and cannot be cancelled');
        }
        break;
    }
  }

  private filterByBusinessRules(
    job: unknown,
    transitions: JobStatus[],
    user: User
  ): JobStatus[] {
    return transitions.filter(status => {
      // Remove completed if job has pending payments
      if (status === 'completed' && job.has_pending_payments) {
        return false;
      }
      // Remove cancelled if job has active work
      if (status === 'cancelled' && job.has_active_work) {
        return false;
      }
      return true;
    });
  }

  private async handleStatusChangeSideEffects(
    job: unknown,
    newStatus: JobStatus,
    user: User
  ): Promise<void> {
    switch (newStatus) {
      case 'cancelled':
        // Cancel all pending bids
        await this.repository.cancelAllBids(job.id);
        // Release any held funds
        await this.repository.releaseHeldFunds(job.id);
        break;
      case 'completed':
        // Trigger payment release process
        await this.repository.initiatePaymentRelease(job.id);
        // Update contractor stats
        if (job.contractor_id) {
          await this.repository.updateContractorStats(job.contractor_id, {
            completedJobs: 1
          });
        }
        break;
      case 'posted':
        // Index job for search
        await this.repository.indexJobForSearch(job.id);
        break;
    }
  }

  private async logStatusChange(
    jobId: string,
    from: JobStatus,
    to: JobStatus,
    user: User,
    reason?: string
  ): Promise<void> {
    await this.repository.createStatusChangeLog(jobId, from, to, user.id, reason);
    logger.info('Job status changed', {
      jobId,
      from,
      to,
      userId: user.id,
      reason
    });
  }

  private async sendNotifications(notifications: Array<{ userId: string; type: string; data: Record<string, unknown> }>): Promise<void> {
    // TODO: Implement actual notification sending
    for (const notification of notifications) {
      logger.info('Would send notification', notification);
    }
  }
}