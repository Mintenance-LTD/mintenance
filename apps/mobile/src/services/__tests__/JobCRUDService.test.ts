/**
 * Tests for JobCRUDService - Job CRUD Operations
 */

import { JobCRUDService } from '../JobCRUDService';
import { supabase } from '../../config/supabase';
import { Job } from '../../types';
import { sanitizeText } from '../../utils/sanitize';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/sanitize');
jest.mock('../../utils/serviceErrorHandler');

describe('JobCRUDService', () => {
  const mockJobData = {
    id: 'job-123',
    title: 'Plumbing Repair',
    description: 'Fix leaky faucet',
    location: 'New York',
    budget: 1000,
    status: 'posted',
    homeowner_id: 'homeowner-123',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sanitizeText as jest.Mock).mockImplementation((text) => text);
    (ServiceErrorHandler.executeOperation as jest.Mock).mockImplementation(
      async (fn) => {
        const result = await fn();
        return { success: true, data: result };
      }
    );
    (ServiceErrorHandler.validateRequired as jest.Mock).mockImplementation(() => {});
    (ServiceErrorHandler.validatePositiveNumber as jest.Mock).mockImplementation(() => {});
  });

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const jobData = {
        title: 'Plumbing Repair',
        description: 'Fix leaky faucet',
        location: 'New York',
        budget: 1000,
        homeownerId: 'homeowner-123',
      };

      const result = await JobCRUDService.createJob(jobData);

      expect(supabase.from).toHaveBeenCalledWith('jobs');
      expect(mockFrom.insert).toHaveBeenCalledWith([
        {
          title: 'Plumbing Repair',
          description: 'Fix leaky faucet',
          location: 'New York',
          budget: 1000,
          homeowner_id: 'homeowner-123',
          status: 'posted',
          category: undefined,
          subcategory: undefined,
          priority: undefined,
          photos: undefined,
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
      ]);
      expect(result).toBeDefined();
    });

    it('should sanitize input text', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.createJob({
        title: 'Test Job',
        description: 'Test description',
        location: 'Test location',
        budget: 1000,
        homeownerId: 'homeowner-123',
      });

      expect(sanitizeText).toHaveBeenCalledWith('Test Job');
      expect(sanitizeText).toHaveBeenCalledWith('Test description');
      expect(sanitizeText).toHaveBeenCalledWith('Test location');
    });

    it('should validate required fields', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.createJob({
        title: 'Test',
        description: 'Test',
        location: 'Test',
        budget: 1000,
        homeownerId: 'homeowner-123',
      });

      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        'Test',
        'Title',
        expect.any(Object)
      );
      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        'Test',
        'Description',
        expect.any(Object)
      );
      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        'Test',
        'Location',
        expect.any(Object)
      );
      expect(ServiceErrorHandler.validatePositiveNumber).toHaveBeenCalledWith(
        1000,
        'Budget',
        expect.any(Object)
      );
    });

    it('should handle homeowner_id field variant', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.createJob({
        title: 'Test',
        description: 'Test',
        location: 'Test',
        budget: 1000,
        homeowner_id: 'homeowner-456',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0][0];
      expect(insertCall.homeowner_id).toBe('homeowner-456');
    });

    it('should include optional fields when provided', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.createJob({
        title: 'Test',
        description: 'Test',
        location: 'Test',
        budget: 1000,
        homeownerId: 'homeowner-123',
        category: 'plumbing',
        subcategory: 'leak-repair',
        priority: 'high',
        photos: ['photo1.jpg', 'photo2.jpg'],
      });

      const insertCall = mockFrom.insert.mock.calls[0][0][0];
      expect(insertCall.category).toBe('plumbing');
      expect(insertCall.subcategory).toBe('leak-repair');
      expect(insertCall.priority).toBe('high');
      expect(insertCall.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    });

    it('should set status to posted by default', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.createJob({
        title: 'Test',
        description: 'Test',
        location: 'Test',
        budget: 1000,
        homeownerId: 'homeowner-123',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0][0];
      expect(insertCall.status).toBe('posted');
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database error');
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);
      (ServiceErrorHandler.handleDatabaseError as jest.Mock).mockReturnValue(error);

      await expect(
        JobCRUDService.createJob({
          title: 'Test',
          description: 'Test',
          location: 'Test',
          budget: 1000,
          homeownerId: 'homeowner-123',
        })
      ).rejects.toThrow();
    });

    it('should throw error when executeOperation fails', async () => {
      (ServiceErrorHandler.executeOperation as jest.Mock).mockResolvedValue({
        success: false,
        data: null,
      });

      await expect(
        JobCRUDService.createJob({
          title: 'Test',
          description: 'Test',
          location: 'Test',
          budget: 1000,
          homeownerId: 'homeowner-123',
        })
      ).rejects.toThrow('Failed to create job');
    });
  });

  describe('getJobById', () => {
    it('should get job by ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('job-123');

      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'job-123');
      expect(result).toBeDefined();
      expect(result?.id).toBe('job-123');
    });

    it('should return null when job not found (PGRST116)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when data is null', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for non-not-found errors', async () => {
      const error = { code: 'OTHER_ERROR', message: 'Database error' };
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobCRUDService.getJobById('job-123')).rejects.toThrow('Database error');
    });
  });

  describe('updateJob', () => {
    it('should update job successfully', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockJobData, title: 'Updated Title' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.updateJob('job-123', {
        title: 'Updated Title',
      });

      expect(mockFrom.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'job-123');
      expect(result.title).toBe('Updated Title');
    });

    it('should validate status field', async () => {
      await expect(
        JobCRUDService.updateJob('job-123', {
          status: 'invalid_status' as any,
        })
      ).rejects.toThrow('Invalid status');
    });

    it('should allow valid status values', async () => {
      const validStatuses: Array<Job['status']> = [
        'posted',
        'assigned',
        'in_progress',
        'completed',
      ];

      for (const status of validStatuses) {
        const mockFrom = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockJobData, status },
            error: null,
          }),
        };
        (supabase.from as jest.Mock).mockReturnValue(mockFrom);

        const result = await JobCRUDService.updateJob('job-123', { status });
        expect(result.status).toBe(status);
      }
    });

    it('should update multiple fields', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockJobData,
            title: 'New Title',
            budget: 2000,
            location: 'Boston',
          },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.updateJob('job-123', {
        title: 'New Title',
        budget: 2000,
        location: 'Boston',
      });

      expect(mockFrom.update).toHaveBeenCalledWith({
        title: 'New Title',
        budget: 2000,
        location: 'Boston',
        updated_at: expect.any(String),
      });
    });

    it('should throw error when job not found', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        JobCRUDService.updateJob('non-existent', { title: 'Test' })
      ).rejects.toThrow('Job not found');
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        JobCRUDService.updateJob('job-123', { title: 'Test' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteJob', () => {
    it('should delete job successfully', async () => {
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.deleteJob('job-123');

      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'job-123');
    });

    it('should throw error when delete fails', async () => {
      const error = { message: 'Delete failed' };
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobCRUDService.deleteJob('job-123')).rejects.toThrow('Delete failed');
    });

    it('should throw generic error when error has no message', async () => {
      const error = {};
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobCRUDService.deleteJob('job-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockJobData, status: 'in_progress' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.updateJobStatus('job-123', 'in_progress');

      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'in_progress',
        updated_at: expect.any(String),
      });
      expect(result.status).toBe('in_progress');
    });

    it('should update job status with contractor ID', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockJobData,
            status: 'assigned',
            contractor_id: 'contractor-123',
          },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.updateJobStatus('job-123', 'assigned', 'contractor-123');

      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'assigned',
        contractor_id: 'contractor-123',
        updated_at: expect.any(String),
      });
    });

    it('should throw error when job not found', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        JobCRUDService.updateJobStatus('non-existent', 'in_progress')
      ).rejects.toThrow('Job not found');
    });

    it('should throw error when update fails', async () => {
      const error = { message: 'Database error' };
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        JobCRUDService.updateJobStatus('job-123', 'in_progress')
      ).rejects.toThrow('Database error');
    });
  });

  describe('startJob', () => {
    it('should start job successfully', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.startJob('job-123');

      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'in_progress',
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'job-123');
    });

    it('should throw error when start fails', async () => {
      const error = new Error('Start failed');
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobCRUDService.startJob('job-123')).rejects.toThrow('Start failed');
    });
  });

  describe('completeJob', () => {
    it('should complete job successfully', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobCRUDService.completeJob('job-123');

      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'completed',
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'job-123');
    });

    it('should throw error when complete fails', async () => {
      const error = new Error('Complete failed');
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobCRUDService.completeJob('job-123')).rejects.toThrow('Complete failed');
    });
  });

  describe('formatJob', () => {
    it('should format job data correctly via getJobById', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJobData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('job-123');

      expect(result).toEqual({
        id: 'job-123',
        title: 'Plumbing Repair',
        description: 'Fix leaky faucet',
        location: 'New York',
        homeowner_id: 'homeowner-123',
        status: 'posted',
        budget: 1000,
        category: '',
        subcategory: '',
        priority: 'medium',
        photos: [],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      });
    });

    it('should handle job with contractor_id', async () => {
      const jobWithContractor = {
        ...mockJobData,
        contractor_id: 'contractor-123',
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: jobWithContractor, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('job-123');

      expect((result as any).contractor_id).toBe('contractor-123');
    });

    it('should provide default values for missing fields', async () => {
      const minimalJob = {
        id: 'job-456',
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: minimalJob, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobCRUDService.getJobById('job-456');

      expect(result?.title).toBe('');
      expect(result?.description).toBe('');
      expect(result?.location).toBe('');
      expect(result?.budget).toBe(0);
      expect(result?.status).toBe('posted');
      expect(result?.category).toBe('');
      expect(result?.subcategory).toBe('');
      expect(result?.priority).toBe('medium');
      expect(result?.photos).toEqual([]);
    });
  });
});
