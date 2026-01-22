import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobService } from '../JobService';
import { User } from '../../users';
import { ListJobsParams } from '../types';

describe('JobService', () => {
  let service: JobService;
  let mockRepo: any;
  let mockAttachmentService: any;
  let mockNotificationService: any;
  let mockGeocodeService: any;
  let mockAiAssessmentService: any;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockJob = {
    id: 'job-123',
    title: 'Test Job',
    description: 'Test Description',
    status: 'posted',
    homeowner_id: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks
    mockRepo = {
      getAvailableJobsQuery: vi.fn(),
      getUserJobsQuery: vi.fn(),
      filterByStatus: vi.fn().mockImplementation((q) => q),
      applyCursor: vi.fn().mockImplementation((q) => q),
      executeQuery: vi.fn(),
      getViewCounts: vi.fn().mockResolvedValue(new Map()),
      getJob: vi.fn(),
      createJob: vi.fn(),
      updateJob: vi.fn(),
      deleteJob: vi.fn(),
      trackJobView: vi.fn(),
      isPhoneVerified: vi.fn(),
      hasActiveSubscription: vi.fn(),
      getJobPostingHistory: vi.fn(),
    };

    mockAttachmentService = {
      getAttachmentsForJobs: vi.fn().mockResolvedValue(new Map()),
      deleteAttachments: vi.fn().mockResolvedValue(true),
      processAttachments: vi.fn().mockImplementation((id, urls) => Promise.resolve(urls)),
      createAttachments: vi.fn(),
      updateAttachments: vi.fn(),
    };

    mockNotificationService = {
      notifyContractors: vi.fn(),
      notifyNearbyContractors: vi.fn(),
    };

    mockGeocodeService = {
      geocodeAddress: vi.fn().mockResolvedValue({ lat: 51.5, lng: -0.1 }),
    };

    mockAiAssessmentService = {
      getAssessmentsForJobs: vi.fn().mockResolvedValue(new Map()),
      assessJob: vi.fn().mockResolvedValue({ id: 'asm-123', urgency: 'high' }),
    };

    // Initialize service with dummy config
    service = new JobService({
      supabase: {} as any,
      enableNotifications: true,
      enableGeocoding: true,
      enableAIAssessment: true
    });

    // Inject mocks
    (service as any).repository = mockRepo;
    (service as any).attachmentService = mockAttachmentService;
    (service as any).notificationService = mockNotificationService;
    (service as any).geocodeService = mockGeocodeService;
    (service as any).aiAssessmentService = mockAiAssessmentService;
  });

  describe('listJobs', () => {
    it('should fetch and enrich jobs for homeowner', async () => {
      const mockQuery = { filter: vi.fn(), range: vi.fn() };
      mockRepo.getUserJobsQuery.mockReturnValue(mockQuery);
      mockRepo.executeQuery.mockResolvedValue({
        data: [mockJob],
        nextCursor: 'cursor-123',
        hasMore: false
      });

      const params: ListJobsParams = { limit: 10, userId: 'user-123', userRole: 'homeowner' };
      const result = await service.listJobs(params);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Test Job');
      expect(mockRepo.getUserJobsQuery).toHaveBeenCalledWith('user-123', 'homeowner');
      expect(mockRepo.executeQuery).toHaveBeenCalled();
    });

    it('should fetch available jobs for contractor', async () => {
      const mockQuery = { filter: vi.fn(), range: vi.fn() };
      mockRepo.getAvailableJobsQuery.mockReturnValue(mockQuery);
      mockRepo.executeQuery.mockResolvedValue({
        data: [mockJob],
        hasMore: false
      });

      const params: ListJobsParams = { limit: 10, userId: 'user-123', userRole: 'contractor', status: ['posted'] };
      const result = await service.listJobs(params);

      expect(mockRepo.getAvailableJobsQuery).toHaveBeenCalled();
      expect(mockRepo.filterByStatus).toHaveBeenCalledWith(mockQuery, ['posted']);
    });
  });

  describe('createJob', () => {
    it('should successfully create a job with photos and AI assessment', async () => {
      mockRepo.isPhoneVerified.mockResolvedValue(true);
      mockRepo.createJob.mockResolvedValue({ ...mockJob, id: 'new-job-123' });
      mockRepo.updateJob.mockResolvedValue({ ...mockJob, id: 'new-job-123', ai_assessment_id: 'asm-123' });

      const createData = {
        title: 'Leaking Pipe',
        description: 'Water everywhere',
        category: 'plumbing',
        location: 'London',
        photoUrls: ['https://example.com/p1.jpg', 'https://example.com/p2.jpg']
      };

      const result = await service.createJob(createData, mockUser);

      expect(result.id).toBe('new-job-123');
      expect(mockGeocodeService.geocodeAddress).toHaveBeenCalledWith('London');
      expect(mockRepo.createJob).toHaveBeenCalled();
      expect(mockAttachmentService.createAttachments).toHaveBeenCalled();
      expect(mockAiAssessmentService.assessJob).toHaveBeenCalled();
      expect(mockNotificationService.notifyNearbyContractors).toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('should delete job and attachments if owned', async () => {
      mockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'posted' });

      await service.deleteJob('new-job-123', mockUser);

      expect(mockAttachmentService.deleteAttachments).toHaveBeenCalledWith('new-job-123');
      expect(mockRepo.deleteJob).toHaveBeenCalledWith('new-job-123');
    });

    it('should throw error if job is in progress', async () => {
      mockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'in_progress' });

      await expect(service.deleteJob('job-123', mockUser))
        .rejects.toThrow('Cannot delete job that is in progress or completed');
    });
  });
});
