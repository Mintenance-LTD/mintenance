import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobDetailsController } from '../JobDetailsController';
import { JobDetailsService } from '../JobDetailsService';
import { JobStatusService } from '../JobStatusService';

// Mock services
vi.mock('../JobDetailsService');
vi.mock('../JobStatusService');

describe('JobDetailsController', () => {
  let controller: JobDetailsController;
  let mockDetailsService: any;
  let mockStatusService: any;

  // Helper to create mock NextRequest objects
  const createMockRequest = (url: string, options: any = {}) => {
    const urlObj = new URL(url, 'http://localhost');
    return {
      url: urlObj.toString(),
      method: options.method || 'GET',
      headers: {
        get: vi.fn((key) => options.headers?.[key] || null),
      },
      json: vi.fn().mockResolvedValue(options.body || {}),
    } as any;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new JobDetailsController();

    // Get mock instances directly from controller
    mockDetailsService = (controller as any).jobDetailsService;
    mockStatusService = (controller as any).jobStatusService;
  });

  describe('getJob', () => {
    it('should return 200 and job details', async () => {
      const mockJob = { id: 'job-123', title: 'Detailed Job' };
      mockDetailsService.getJobWithDetails.mockResolvedValue(mockJob);

      const request = createMockRequest('http://api/jobs/123');
      const response = await controller.getJob(request, { params: { id: '123' } });

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body).id).toBe('job-123');
      expect(mockDetailsService.getJobWithDetails).toHaveBeenCalledWith('123', expect.anything());
    });
  });

  describe('updateJob', () => {
    it('should return 200 on successful update', async () => {
      const mockJob = { id: '123', title: 'Updated' };
      mockDetailsService.updateJobFull.mockResolvedValue(mockJob);

      const request = createMockRequest('http://api/jobs/123', {
        method: 'PUT',
        body: { title: 'Updated' }
      });
      const response = await controller.updateJob(request, { params: { id: '123' } });

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body).title).toBe('Updated');
    });
  });

  describe('patchJob', () => {
    it('should handle status updates via JobStatusService', async () => {
      const mockJob = { id: '123', status: 'posted' };
      mockStatusService.updateJobStatus.mockResolvedValue(mockJob);

      const request = createMockRequest('http://api/jobs/123', {
        method: 'PATCH',
        body: { status: 'posted', reason: 'Ready' }
      });
      const response = await controller.patchJob(request, { params: { id: '123' } });

      expect(response.status).toBe(200);
      expect(mockStatusService.updateJobStatus).toHaveBeenCalled();
      expect(mockStatusService.handleStatusChangeNotifications).toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('should return 200 on successful deletion', async () => {
      mockDetailsService.deleteJob.mockResolvedValue(undefined);

      const request = createMockRequest('http://api/jobs/123', { method: 'DELETE' });
      const response = await controller.deleteJob(request, { params: { id: '123' } });

      expect(response.status).toBe(200);
      expect(mockDetailsService.deleteJob).toHaveBeenCalled();
    });
  });
});
