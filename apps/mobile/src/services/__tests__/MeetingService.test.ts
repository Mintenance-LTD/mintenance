// MeetingService facade tests.
//
// Realigned 2026-06-04 to the current implementation. The CRUD + location
// methods were migrated off direct Supabase to the web API via
// mobileApiClient (audit-55 / audit-78, 2026-05-26/27):
//   createMeeting          -> POST  /api/contractor/appointments
//   getMeetingById         -> GET   /api/contractor/appointments/:id
//   getMeetingsForUser     -> GET   /api/contractor/appointments | /api/appointments
//   updateMeetingStatus    -> PATCH /api/contractor/appointments/:id
//   rescheduleMeeting      -> PATCH /api/contractor/appointments/:id
//   updateContractorLocation -> POST /api/contractors/:id/location
//   getContractorLocation    -> GET  /api/contractors/:id/location
// Responses are `appointments` rows coerced to the snake_case ContractorMeeting
// shape via mapAppointmentToMeeting. createMeetingUpdate / getMeetingUpdates are
// now intentional no-ops (no appointment_history table). Subscriptions still go
// through supabase Realtime channels.

import { MeetingService } from '../MeetingService';
import { logger } from '../../utils/logger';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { mobileApiClient } from '../../utils/mobileApiClient';

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

// Mock supabase using the manual mock (used by subscription channels)
jest.mock('../../config/supabase');
const { supabase, __resetSupabaseMock } = require('../../config/supabase');

// Manual mock at src/utils/__mocks__/mobileApiClient.ts
jest.mock('../../utils/mobileApiClient');
const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

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
    validateRequired: jest.fn((value, name) => {
      if (!value) {
        throw new Error(`${name} is required`);
      }
    }),
    executeOperation: jest.fn().mockImplementation(async (operation) => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        return { success: false, error };
      }
    }),
    handleDatabaseError: jest.fn((error) => error),
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

// An `appointments` row as the API returns it.
const createMockAppointment = (overrides: Record<string, unknown> = {}) => ({
  id: 'meeting-123',
  contractor_id: 'contractor-101',
  client_id: 'homeowner-789',
  job_id: 'job-456',
  title: 'site_visit meeting',
  appointment_date: '2026-01-25',
  start_time: '14:00:00',
  end_time: '15:00:00',
  duration_minutes: 60,
  location_type: 'onsite',
  location_address: '123 Main St, New York, NY',
  status: 'scheduled',
  notes: 'Initial consultation',
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  client: {
    id: 'homeowner-789',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-0100',
    profile_image_url: 'https://example.com/john.jpg',
  },
  contractor: {
    id: 'contractor-101',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '555-0200',
    profile_image_url: 'https://example.com/jane.jpg',
  },
  job: {
    id: 'job-456',
    title: 'Kitchen Renovation',
    status: 'in_progress',
    latitude: 40.7128,
    longitude: -74.006,
    location: '123 Main St',
  },
  ...overrides,
});

describe('MeetingService', () => {
  beforeEach(() => {
    __resetSupabaseMock();
    jest.clearAllMocks();
  });

  describe('createMeeting', () => {
    const baseData = {
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

    it('should create meeting with all required fields', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        appointment: createMockAppointment(),
      });

      const result = await MeetingService.createMeeting(baseData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/appointments',
        expect.objectContaining({ jobId: 'job-456' })
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('meeting-123');
      expect(result.job_id).toBe('job-456');
    });

    it('should validate required jobId field', async () => {
      const invalidData = { ...baseData, jobId: '' };

      await expect(MeetingService.createMeeting(invalidData)).rejects.toThrow();
      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockedApiClient.post.mockRejectedValueOnce(new Error('network'));

      await expect(MeetingService.createMeeting(baseData)).rejects.toThrow(
        'Failed to create meeting'
      );
    });
  });

  describe('getMeetingById', () => {
    it('should fetch meeting with nested relations', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointment: createMockAppointment(),
      });

      const result = await MeetingService.getMeetingById('meeting-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123'
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
    });

    it('should return null for non-existent meeting (404)', async () => {
      mockedApiClient.get.mockRejectedValueOnce({ statusCode: 404 });

      const result = await MeetingService.getMeetingById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMeetingsForUser', () => {
    it('should fetch meetings for homeowner role', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointments: [
          createMockAppointment(),
          createMockAppointment({ id: 'meeting-456' }),
        ],
      });

      const result = await MeetingService.getMeetingsForUser(
        'homeowner-789',
        'homeowner'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/appointments');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should fetch meetings for contractor role', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointments: [createMockAppointment()],
      });

      const result = await MeetingService.getMeetingsForUser(
        'contractor-101',
        'contractor'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/appointments'
      );
      expect(result.length).toBe(1);
    });

    it('should return empty array on no results', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ appointments: [] });

      const result = await MeetingService.getMeetingsForUser(
        'homeowner-789',
        'homeowner'
      );

      expect(result).toEqual([]);
    });
  });

  describe('updateMeetingStatus', () => {
    it('should update meeting status', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({
        appointment: createMockAppointment({ status: 'confirmed' }),
      });

      const result = await MeetingService.updateMeetingStatus(
        'meeting-123',
        'confirmed',
        'contractor-101',
        'Confirmed availability'
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123',
        expect.objectContaining({ status: 'confirmed' })
      );
      expect(result.status).toBe('confirmed');
    });

    it('should throw on API error', async () => {
      mockedApiClient.patch.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        MeetingService.updateMeetingStatus(
          'meeting-123',
          'confirmed',
          'contractor-101'
        )
      ).rejects.toThrow('update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('rescheduleMeeting', () => {
    it('should reschedule meeting', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({
        appointment: createMockAppointment({
          appointment_date: '2026-01-26',
          start_time: '15:00:00',
          status: 'rescheduled',
        }),
      });

      const result = await MeetingService.rescheduleMeeting(
        'meeting-123',
        '2026-01-26T15:00:00Z',
        'contractor-101',
        'Customer requested different time'
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123',
        expect.objectContaining({ status: 'rescheduled' })
      );
      expect(result.status).toBe('rescheduled');
    });
  });

  describe('updateContractorLocation', () => {
    it('should post contractor location and coerce the response', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        location: {
          id: 'location-123',
          latitude: 40.758,
          longitude: -73.9855,
          accuracy: 10,
          timestamp: '2026-01-25T13:45:00Z',
        },
      });

      const result = await MeetingService.updateContractorLocation(
        'contractor-101',
        { latitude: 40.758, longitude: -73.9855, address: '456 Broadway' },
        'meeting-123'
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractors/contractor-101/location',
        expect.objectContaining({ latitude: 40.758, longitude: -73.9855 })
      );
      expect(result.contractorId).toBe('contractor-101');
      expect(result.latitude).toBe(40.758);
      expect(result.meetingId).toBe('meeting-123');
    });
  });

  describe('getContractorLocation', () => {
    it('should fetch active contractor location', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        location: {
          id: 'location-123',
          latitude: 40.758,
          longitude: -73.9855,
          accuracy: 10,
          timestamp: '2026-01-25T13:45:00Z',
          is_sharing_location: true,
        },
      });

      const result =
        await MeetingService.getContractorLocation('contractor-101');

      expect(result).toBeDefined();
      expect(result!.contractorId).toBe('contractor-101');
    });

    it('should return null when no active location found (404)', async () => {
      mockedApiClient.get.mockRejectedValueOnce({ statusCode: 404 });

      const result =
        await MeetingService.getContractorLocation('contractor-101');

      expect(result).toBeNull();
    });
  });

  describe('createMeetingUpdate', () => {
    it('should synthesise an update record', async () => {
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

    it('should carry through structured values', async () => {
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
    it('should return an empty timeline (no appointment_history table)', async () => {
      const result = await MeetingService.getMeetingUpdates('meeting-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to contractor location updates', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToContractorLocation(
        'contractor-101',
        callback
      );

      expect(supabase.channel).toHaveBeenCalledWith(
        'contractor_location_contractor-101'
      );
      expect(subscription).toBeDefined();
    });

    it('should subscribe to meeting updates', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToMeetingUpdates(
        'meeting-123',
        callback
      );

      expect(supabase.channel).toHaveBeenCalledWith('meeting_meeting-123');
      expect(subscription).toBeDefined();
    });

    it('should subscribe to contractor travel location', () => {
      const callback = jest.fn();

      const subscription = MeetingService.subscribeToContractorTravelLocation(
        'meeting-123',
        'contractor-101',
        callback
      );

      expect(supabase.channel).toHaveBeenCalledWith(
        'contractor_travel_meeting-123'
      );
      expect(subscription).toBeDefined();
    });
  });
});
