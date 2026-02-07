// Mock AsyncStorage first
// Import REAL service (after mocks)
import { MeetingService } from '../MeetingService';
import { logger } from '../../utils/logger';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock supabase using the manual mock
jest.mock('../../config/supabase');
const {
  supabase,
  __resetSupabaseMock,
  __setMockData,
  __queueMockData,
} = require('../../config/supabase');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn((value, name, context) => {
      if (!value) {
        throw new Error(`${name} is required`);
      }
    }),
    executeOperation: jest.fn().mockImplementation(async (operation, context) => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        return { success: false, error };
      }
    }),
    handleDatabaseError: jest.fn((error, context) => error),
  },
}));

// Mock JobContextLocationService
jest.mock('../JobContextLocationService', () => ({
  JobContextLocationService: jest.fn().mockImplementation(() => ({
    startJobTracking: jest.fn(),
    markArrived: jest.fn(),
    stopTracking: jest.fn(),
  })),
  ContractorLocationContext: {
    IDLE: 'IDLE',
    TRAVELING_TO_JOB: 'TRAVELING_TO_JOB',
    AT_JOB_SITE: 'AT_JOB_SITE',
  },
}));

// Mock data helpers
const createMockMeetingDb = (overrides = {}) => ({
  id: 'meeting-123',
  job_id: 'job-456',
  homeowner_id: 'homeowner-789',
  contractor_id: 'contractor-101',
  scheduled_datetime: '2026-01-25T14:00:00Z',
  status: 'scheduled',
  meeting_type: 'site_visit',
  latitude: 40.7128,
  longitude: -74.006,
  address: '123 Main St, New York, NY',
  duration: 60,
  notes: 'Initial consultation',
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  homeowner: {
    id: 'homeowner-789',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-0100',
    profile_image_url: 'https://example.com/john.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  contractor: {
    id: 'contractor-101',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '555-0200',
    profile_image_url: 'https://example.com/jane.jpg',
    rating: 4.8,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  job: {
    id: 'job-456',
    title: 'Kitchen Renovation',
    description: 'Complete kitchen remodel',
    budget: 15000,
    status: 'in_progress',
    location: '123 Main St',
    homeowner_id: 'homeowner-789',
    contractor_id: 'contractor-101',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  ...overrides,
});

const createMockLocationDb = (overrides = {}) => ({
  id: 'location-123',
  contractor_id: 'contractor-101',
  latitude: 40.7580,
  longitude: -73.9855,
  accuracy: 10,
  timestamp: '2026-01-25T13:45:00Z',
  is_active: true,
  meeting_id: 'meeting-123',
  ...overrides,
});

const createMockUpdateDb = (overrides = {}) => ({
  id: 'update-123',
  meeting_id: 'meeting-123',
  update_type: 'status_change',
  message: 'Meeting status updated',
  updated_by: 'contractor-101',
  timestamp: '2026-01-25T12:00:00Z',
  old_value: '"scheduled"',
  new_value: '"confirmed"',
  ...overrides,
});

describe('MeetingService', () => {
  beforeEach(() => {
    __resetSupabaseMock();
  });

  describe('createMeeting', () => {
    it('should create meeting with all required fields', async () => {
      const meetingData = {
        jobId: 'job-456',
        homeownerId: 'homeowner-789',
        contractorId: 'contractor-101',
        scheduledDateTime: '2026-01-25T14:00:00Z',
        meetingType: 'site_visit' as const,
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Main St',
        },
        duration: 60,
        notes: 'Test meeting',
      };

      const mockData = createMockMeetingDb();
      __setMockData(mockData);

      const result = await MeetingService.createMeeting(meetingData);

      expect(result).toBeDefined();
      expect(result.id).toBe('meeting-123');
      expect(result.jobId).toBe('job-456');
    });

    it('should validate required jobId field', async () => {
      const invalidData = {
        jobId: '',
        homeownerId: 'homeowner-789',
        contractorId: 'contractor-101',
        scheduledDateTime: '2026-01-25T14:00:00Z',
        meetingType: 'site_visit' as const,
        location: { latitude: 40, longitude: -74, address: '123 Main' },
        duration: 60,
      };

      await expect(MeetingService.createMeeting(invalidData)).rejects.toThrow();
      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const meetingData = {
        jobId: 'job-456',
        homeownerId: 'homeowner-789',
        contractorId: 'contractor-101',
        scheduledDateTime: '2026-01-25T14:00:00Z',
        meetingType: 'consultation' as const,
        location: { latitude: 40, longitude: -74, address: '123 Main' },
        duration: 30,
      };

      __setMockData(null);

      await expect(MeetingService.createMeeting(meetingData)).rejects.toThrow('Failed to create meeting');
    });
  });

  describe('getMeetingById', () => {
    it('should fetch meeting with nested relations', async () => {
      const mockData = createMockMeetingDb();
      __setMockData(mockData);

      const result = await MeetingService.getMeetingById('meeting-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
      expect(result!.job).toBeDefined();
    });

    it('should return null for non-existent meeting (PGRST116)', async () => {
      __setMockData(null);

      const result = await MeetingService.getMeetingById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMeetingsForUser', () => {
    it('should fetch meetings for homeowner role', async () => {
      const mockData = [createMockMeetingDb(), createMockMeetingDb({ id: 'meeting-456' })];
      __setMockData(mockData);

      const result = await MeetingService.getMeetingsForUser('homeowner-789', 'homeowner');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should fetch meetings for contractor role', async () => {
      const mockData = [createMockMeetingDb()];
      __setMockData(mockData);

      const result = await MeetingService.getMeetingsForUser('contractor-101', 'contractor');

      expect(result.length).toBe(1);
    });

    it('should return empty array on no results', async () => {
      __setMockData([]);

      const result = await MeetingService.getMeetingsForUser('homeowner-789', 'homeowner');

      expect(result).toEqual([]);
    });
  });

  describe('updateMeetingStatus', () => {
    it('should update meeting status and create update log', async () => {
      const mockUpdated = createMockMeetingDb({ status: 'confirmed' });
      const mockUpdateLog = createMockUpdateDb();

      __queueMockData([mockUpdated, mockUpdateLog]);

      const result = await MeetingService.updateMeetingStatus(
        'meeting-123',
        'confirmed',
        'contractor-101',
        'Confirmed availability'
      );

      expect(result.status).toBe('confirmed');
    });

    it('should throw if no data returned', async () => {
      __setMockData(null);

      await expect(
        MeetingService.updateMeetingStatus('meeting-123', 'confirmed', 'contractor-101')
      ).rejects.toThrow('Failed to update meeting');
    });
  });

  describe('rescheduleMeeting', () => {
    it('should reschedule meeting and log change', async () => {
      const currentMeeting = createMockMeetingDb();
      const rescheduledMeeting = createMockMeetingDb({
        scheduled_datetime: '2026-01-26T15:00:00Z',
        status: 'rescheduled',
      });
      const mockUpdateLog = createMockUpdateDb({ update_type: 'schedule_change' });

      __queueMockData([currentMeeting, rescheduledMeeting, mockUpdateLog]);

      const result = await MeetingService.rescheduleMeeting(
        'meeting-123',
        '2026-01-26T15:00:00Z',
        'contractor-101',
        'Customer requested different time'
      );

      expect(result.scheduledDateTime).toBe('2026-01-26T15:00:00Z');
      expect(result.status).toBe('rescheduled');
    });
  });

  describe('updateContractorLocation', () => {
    it('should upsert contractor location', async () => {
      const mockLocation = createMockLocationDb();
      __setMockData(mockLocation);

      const result = await MeetingService.updateContractorLocation(
        'contractor-101',
        { latitude: 40.7580, longitude: -73.9855, address: '456 Broadway' },
        'meeting-123'
      );

      expect(result.contractorId).toBe('contractor-101');
      expect(result.latitude).toBe(40.7580);
      expect(result.meetingId).toBe('meeting-123');
    });
  });

  describe('getContractorLocation', () => {
    it('should fetch active contractor location', async () => {
      const mockLocation = createMockLocationDb();
      __setMockData(mockLocation);

      const result = await MeetingService.getContractorLocation('contractor-101');

      expect(result).toBeDefined();
      expect(result!.contractorId).toBe('contractor-101');
    });

    it('should return null when no active location found', async () => {
      __setMockData(null);

      const result = await MeetingService.getContractorLocation('contractor-101');

      expect(result).toBeNull();
    });
  });

  describe('createMeetingUpdate', () => {
    it('should create meeting update with all fields', async () => {
      const mockUpdate = createMockUpdateDb();
      __setMockData(mockUpdate);

      const result = await MeetingService.createMeetingUpdate({
        meetingId: 'meeting-123',
        updateType: 'status_change',
        message: 'Status updated',
        updatedBy: 'contractor-101',
        oldValue: 'scheduled',
        newValue: 'confirmed',
      });

      expect(result.meetingId).toBe('meeting-123');
      expect(result.updateType).toBe('status_change');
    });

    it('should handle JSON serialization of values', async () => {
      const mockUpdate = createMockUpdateDb({
        old_value: JSON.stringify({ status: 'scheduled' }),
        new_value: JSON.stringify({ status: 'confirmed' }),
      });
      __setMockData(mockUpdate);

      const result = await MeetingService.createMeetingUpdate({
        meetingId: 'meeting-123',
        updateType: 'status_change',
        message: 'Updated',
        updatedBy: 'contractor-101',
        oldValue: { status: 'scheduled' },
        newValue: { status: 'confirmed' },
      });

      expect(result.oldValue).toEqual({ status: 'scheduled' });
      expect(result.newValue).toEqual({ status: 'confirmed' });
    });
  });

  describe('getMeetingUpdates', () => {
    it('should fetch all updates for a meeting', async () => {
      const mockUpdates = [
        createMockUpdateDb(),
        createMockUpdateDb({ id: 'update-456', update_type: 'schedule_change' }),
      ];
      __setMockData(mockUpdates);

      const result = await MeetingService.getMeetingUpdates('meeting-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no updates', async () => {
      __setMockData([]);

      const result = await MeetingService.getMeetingUpdates('meeting-123');

      expect(result).toEqual([]);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to contractor location updates', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToContractorLocation('contractor-101', callback);

      expect(supabase.channel).toHaveBeenCalledWith('contractor_location_contractor-101');
      expect(subscription).toBeDefined();
    });

    it('should subscribe to meeting updates', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToMeetingUpdates('meeting-123', callback);

      expect(supabase.channel).toHaveBeenCalledWith('meeting_meeting-123');
      expect(subscription).toBeDefined();
    });

    it('should subscribe to contractor travel location', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToContractorTravelLocation('meeting-123', 'contractor-101', callback);

      expect(supabase.channel).toHaveBeenCalledWith('contractor_travel_meeting-123');
      expect(subscription).toBeDefined();
    });
  });
});
