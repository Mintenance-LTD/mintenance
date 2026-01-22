import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { JobStatusService } from '../JobStatusService';
import { JobRepository } from '../JobRepository';
import { JobStatus } from '../types';
import { User } from '../../users';

// Mock the JobRepository module
vi.mock('../JobRepository');

describe('JobStatusService', () => {
  let service: JobStatusService;
  let mockRepository: any;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockAdmin: User = { ...mockUser, id: 'admin-123', role: 'admin' };
  const mockContractor: User = { ...mockUser, id: 'contractor-123', role: 'contractor' };

  const mockJob = {
    id: 'job-123',
    title: 'Test Job',
    description: 'Test Description',
    status: 'draft',
    homeowner_id: 'user-123',
    contractor_id: null,
    location: 'Test Location',
    latitude: 0,
    longitude: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup service with dummy config
    service = new JobStatusService({
      supabase: {} as any,
      enableNotifications: false
    });

    // In Vitest, when you vi.mock a class, the mocked constructor 
    // tracks instances. Standard way to get the mock instance:
    mockRepository = vi.mocked(JobRepository).mock.results[0]?.value || {};
  });

  describe('isValidTransition', () => {
    it('should allow valid transitions', () => {
      expect(service.isValidTransition('draft', 'posted')).toBe(true);
      expect(service.isValidTransition('posted', 'in_progress')).toBe(true);
      expect(service.isValidTransition('in_progress', 'completed')).toBe(true);
    });

    it('should block invalid transitions', () => {
      expect(service.isValidTransition('draft', 'completed')).toBe(false);
      expect(service.isValidTransition('completed', 'draft')).toBe(false);
    });
  });

  describe('updateJobStatus', () => {
    it('should successfully update status from draft to posted for owner', async () => {
      mockRepository.getJob.mockResolvedValue(mockJob);
      mockRepository.updateJob.mockResolvedValue({ ...mockJob, status: 'posted' });

      const result = await service.updateJobStatus('job-123', 'posted', mockUser);

      expect(result.status).toBe('posted');
      expect(mockRepository.updateJob).toHaveBeenCalledWith('job-123', expect.objectContaining({
        status: 'posted'
      }));
    });

    it('should throw error if job not found', async () => {
      mockRepository.getJob.mockResolvedValue(null);

      await expect(service.updateJobStatus('job-123', 'posted', mockUser))
        .rejects.toThrow('Job not found');
    });

    it('should enforce ownership', async () => {
      mockRepository.getJob.mockResolvedValue({ ...mockJob, homeowner_id: 'other-user' });

      await expect(service.updateJobStatus('job-123', 'posted', mockUser))
        .rejects.toThrow('Only the job owner can change this status');
    });

    it('should allow admin to bypass ownership', async () => {
      mockRepository.getJob.mockResolvedValue({ ...mockJob, homeowner_id: 'other-user' });
      mockRepository.updateJob.mockResolvedValue({ ...mockJob, status: 'posted' });

      const result = await service.updateJobStatus('job-123', 'posted', mockAdmin);
      expect(result.status).toBe('posted');
    });

    it('should enforce business rules: cannot post without description', async () => {
      mockRepository.getJob.mockResolvedValue({ ...mockJob, description: '' });

      await expect(service.updateJobStatus('job-123', 'posted', mockUser))
        .rejects.toThrow('Job must have title and description to be posted');
    });

    it('should check for accepted bid when moving to in_progress', async () => {
      mockRepository.getJob.mockResolvedValue({ ...mockJob, status: 'posted' });
      mockRepository.getAcceptedBidForJob.mockResolvedValue(null);

      await expect(service.updateJobStatus('job-123', 'in_progress', mockUser))
        .rejects.toThrow('Job must have an accepted bid or assigned contractor');
    });

    it('should check for pending payments before completing', async () => {
      mockRepository.getJob.mockResolvedValue({ ...mockJob, status: 'in_progress', contractor_id: 'contractor-123' });
      mockRepository.hasPendingPayments.mockResolvedValue(true);

      await expect(service.updateJobStatus('job-123', 'completed', mockContractor))
        .rejects.toThrow('Job has pending payments and cannot be marked as completed');
    });
  });

  describe('Notifications', () => {
    it('should call getNearbyContractors when job is posted', async () => {
      // Re-initialize with notifications enabled
      service = new JobStatusService({
        supabase: {} as any,
        enableNotifications: true
      });
      const newMockRepo = vi.mocked(JobRepository).mock.results[1].value;

      newMockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'posted' });
      newMockRepo.getNearbyContractors.mockResolvedValue(['c1', 'c2']);

      await service.handleStatusChangeNotifications('job-123', 'posted', mockUser);

      expect(newMockRepo.getNearbyContractors).toHaveBeenCalled();
    });
  });
});
