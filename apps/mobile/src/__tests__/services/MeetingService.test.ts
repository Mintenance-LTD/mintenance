import { MeetingService } from '../../services/MeetingService';
import {
  ContractorMeeting,
  ContractorLocation,
  MeetingUpdate,
  LocationData,
} from '../../types';

// Mock data (defined first so it can be used in mocks)
const mockMeetingData = {
  id: 'meeting-123',
  job_id: 'job-123',
  homeowner_id: 'homeowner-123',
  contractor_id: 'contractor-123',
  scheduled_datetime: '2024-03-15T14:00:00.000Z',
  status: 'scheduled',
  meeting_type: 'site_visit',
  latitude: 40.7128,
  longitude: -74.006,
  address: '123 Main St, New York, NY',
  duration: 60,
  notes: 'Initial assessment meeting',
  created_at: '2024-03-10T10:00:00.000Z',
  updated_at: '2024-03-10T10:00:00.000Z',
  homeowner: {
    id: 'homeowner-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
  },
  contractor: {
    id: 'contractor-123',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    rating: 4.8,
  },
  job: {
    id: 'job-123',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation',
    budget: 5000,
    status: 'assigned',
  },
};

const mockLocationData = {
  id: 'location-123',
  contractor_id: 'contractor-123',
  latitude: 40.75,
  longitude: -73.9857,
  accuracy: 10,
  timestamp: '2024-03-15T13:30:00.000Z',
  is_active: true,
  meeting_id: 'meeting-123',
};

const mockUpdateData = {
  id: 'update-123',
  meeting_id: 'meeting-123',
  update_type: 'status_change',
  message: 'Meeting confirmed',
  updated_by: 'contractor-123',
  timestamp: '2024-03-15T09:00:00.000Z',
  old_value: null,
  new_value: '"confirmed"',
};

// Mock supabase using the manual mock
jest.mock('../../config/supabase');
const {
  supabase,
  __resetSupabaseMock,
  __setMockData,
} = require('../../config/supabase');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn(),
    executeOperation: jest.fn().mockImplementation(async (operation) => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        throw error; // Re-throw to match service expectation
      }
    }),
    handleDatabaseError: jest.fn((error) => error),
  },
}));

const { ServiceErrorHandler } = require('../../utils/serviceErrorHandler');

describe('MeetingService', () => {
  beforeEach(() => {
    __resetSupabaseMock();
    // Set default test data for all positive tests
    __setMockData(mockMeetingData);
  });

  describe('createMeeting', () => {
    it('should create a new meeting successfully', async () => {
      const meetingData = {
        jobId: 'job-123',
        homeownerId: 'homeowner-123',
        contractorId: 'contractor-123',
        scheduledDateTime: '2024-03-15T14:00:00.000Z',
        meetingType: 'site_visit' as const,
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Main St, New York, NY',
        } as LocationData,
        duration: 60,
        notes: 'Initial assessment meeting',
      };

      // Mock data already set in beforeEach

      const result = await MeetingService.createMeeting(meetingData);

      expect(result).toBeDefined();
      expect(result.id).toBe('meeting-123');
    });

    it('should handle missing required fields', async () => {
      const invalidMeetingData = {
        jobId: '',
        homeownerId: '',
        contractorId: '',
        scheduledDateTime: '',
        meetingType: 'site_visit' as const,
        location: {
          latitude: 0,
          longitude: 0,
        } as LocationData,
        duration: 0,
      };

      // Override default mock data for this specific error test
      __setMockData(null);

      await expect(MeetingService.createMeeting(invalidMeetingData)).rejects.toThrow();
    });
  });

  describe('getMeetingById', () => {
    it('should fetch meeting by ID successfully', async () => {
      const meetingId = 'meeting-123';

      // Mock data already set in beforeEach

      const result = await MeetingService.getMeetingById(meetingId);

      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
      expect(result!.job).toBeDefined();
    });

    it('should return null for non-existent meeting', async () => {
      __setMockData(null); // Override for error case

      const result = await MeetingService.getMeetingById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMeetingsForUser', () => {
    it('should fetch meetings for homeowner', async () => {
      const userId = 'homeowner-123';
      const role = 'homeowner';

      __setMockData([mockMeetingData]); // Set array data for list operation

      const result = await MeetingService.getMeetingsForUser(userId, role);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].homeownerId).toBe(userId);
    });

    it('should fetch meetings for contractor', async () => {
      const userId = 'contractor-321';
      const role = 'contractor';

      __setMockData([{ ...mockMeetingData, contractor_id: userId }]);

      const result = await MeetingService.getMeetingsForUser(userId, role);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contractorId).toBe(userId);
    });

    it('should filter meetings by status', async () => {
      const userId = 'homeowner-123';
      const role = 'homeowner';
      const status = 'scheduled';

      __setMockData([{ ...mockMeetingData, status }]);

      const result = await MeetingService.getMeetingsForUser(userId, role, status);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].status).toBe(status);
    });
  });

  describe('updateMeetingStatus', () => {
    it('should update meeting status successfully', async () => {
      const meetingId = 'meeting-123';
      const newStatus: ContractorMeeting['status'] = 'confirmed';
      const updatedBy = 'contractor-123';
      const notes = 'Meeting confirmed by contractor';

      __setMockData({ ...mockMeetingData, status: newStatus, notes });

      const result = await MeetingService.updateMeetingStatus(
        meetingId,
        newStatus,
        updatedBy,
        notes,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(newStatus);
      expect(result.notes).toBe(notes);
    });

    it('should handle invalid status updates', async () => {
      __setMockData(null);

      await expect(
        MeetingService.updateMeetingStatus('meeting-123', 'invalid_status' as any, 'user-123'),
      ).rejects.toThrow('Invalid status');
    });
  });

  describe('rescheduleMeeting', () => {
    it('should reschedule meeting successfully', async () => {
      const meetingId = 'meeting-123';
      const newDateTime = '2024-03-16T15:00:00.000Z';
      const updatedBy = 'homeowner-123';
      const reason = 'Schedule conflict';

      __setMockData(mockMeetingData);
      __setMockData({
        ...mockMeetingData,
        scheduled_datetime: newDateTime,
        status: 'rescheduled',
        notes: reason,
      });

      const result = await MeetingService.rescheduleMeeting(
        meetingId,
        newDateTime,
        updatedBy,
        reason,
      );

      expect(result).toBeDefined();
      expect(result.scheduledDateTime).toBe(newDateTime);
      expect(result.status).toBe('rescheduled');
    });
  });

  describe('updateContractorLocation', () => {
    it('should update contractor location successfully', async () => {
      const contractorId = 'contractor-123';
      const location: LocationData = {
        latitude: 40.75,
        longitude: -73.9857,
        address: 'Times Square, NYC',
      };
      const meetingId = 'meeting-123';

      __setMockData({
        id: 'location-updated',
        contractor_id: contractorId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: 10,
        timestamp: '2024-03-15T13:45:00.000Z',
        is_active: true,
        meeting_id: meetingId,
      });

      const result = await MeetingService.updateContractorLocation(
        contractorId,
        location,
        meetingId,
      );

      expect(result).toBeDefined();
      expect(result.contractorId).toBe(contractorId);
      expect(result.latitude).toBe(location.latitude);
      expect(result.longitude).toBe(location.longitude);
      expect(result.meetingId).toBe(meetingId);
    });

    it('should handle location update errors', async () => {
      __setMockData(null);

      const location: LocationData = {
        latitude: 40.75,
        longitude: -73.9857,
      };

      await expect(
        MeetingService.updateContractorLocation('contractor-123', location),
      ).rejects.toThrow('Location update failed');
    });
  });

  describe('getContractorLocation', () => {
    it('should fetch contractor location successfully', async () => {
      __setMockData(mockLocationData); // Specific data for location test

      const result = await MeetingService.getContractorLocation('contractor-123');

      expect(result).toBeDefined();
      expect(result!.contractorId).toBe('contractor-123');
      expect(result!.isActive).toBe(true);
    });

    it('should return null for contractor without location', async () => {
      __setMockData(null); // Override for null case

      const result = await MeetingService.getContractorLocation('contractor-123');

      expect(result).toBeNull();
    });
  });

  describe('createMeetingUpdate', () => {
    it('should create meeting update successfully', async () => {
      const updateData = {
        meetingId: 'meeting-123',
        updateType: 'status_change' as const,
        message: 'Meeting confirmed',
        updatedBy: 'contractor-123',
        oldValue: 'scheduled',
        newValue: 'confirmed',
      };

      __setMockData(mockUpdateData); // Specific data for update test

      const result = await MeetingService.createMeetingUpdate(updateData);

      expect(result).toBeDefined();
      expect(result.meetingId).toBe('meeting-123');
      expect(result.updateType).toBe('status_change');
      expect(result.message).toBe('Meeting confirmed');
    });
  });

  describe('getMeetingUpdates', () => {
    it('should fetch meeting updates successfully', async () => {
      __setMockData([mockUpdateData]); // Array data for list operation

      const result = await MeetingService.getMeetingUpdates('meeting-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].meetingId).toBe('meeting-123');
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up contractor location subscription', () => {
      const contractorId = 'contractor-123';
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToContractorLocation(contractorId, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`contractor_location_${contractorId}`);
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should set up meeting updates subscription', () => {
      const meetingId = 'meeting-123';
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToMeetingUpdates(meetingId, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`meeting_${meetingId}`);
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });
  });

  describe('data mapping', () => {
    it('should correctly map database data to meeting object', async () => {
      const meetingId = 'meeting-123';

      // Mock data already set in beforeEach, no need to set again

      const result = await MeetingService.getMeetingById(meetingId);

      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.jobId).toBe('job-123');
      expect(result!.homeownerId).toBe('homeowner-123');
      expect(result!.contractorId).toBe('contractor-123');
      expect(result!.scheduledDateTime).toBe('2024-03-15T14:00:00.000Z');
      expect(result!.status).toBe('scheduled');
      expect(result!.meetingType).toBe('site_visit');
      expect(result!.location).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Main St, New York, NY',
      });
      expect(result!.duration).toBe(60);
      expect(result!.notes).toBe('Initial assessment meeting');
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
      expect(result!.job).toBeDefined();
    });
  });
});
