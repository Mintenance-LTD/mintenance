import { ContractorMeeting, LocationData } from '../../types';

// Import the REAL MeetingService (not mocked) - we want to test the actual implementation
import { MeetingService } from '../../services/MeetingService';
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

// 2026-05-26/27 audits 55/78/84: MeetingService.createMeeting +
// read/update siblings + location calls now route through the web API
// (`/api/contractor/appointments[/:id]` + `/api/contractors/:id/location`)
// rather than direct Supabase. The API client is therefore the relevant
// mock surface. Supabase is still used for the realtime channel
// subscriptions further down, so keep a channel mock alive too.
jest.mock('../../utils/mobileApiClient');

// LocationTracker → JobContextLocationService → BackgroundLocationTask
// pulls in expo-task-manager at import time. It's mocked globally only
// inside the navigation suite, so stub it here too (otherwise its
// EventEmitter native binding throws on require).
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterAllTasksAsync: jest.fn().mockResolvedValue(undefined),
}));

// config/supabase is force-mapped to the chainable manual mock via
// jest.config.js moduleNameMapper — that mock already provides
// supabase.channel() for the realtime-subscription tests below.
jest.mock('../../config/supabase');

// Mock logger (must include warn — mobileApiClient logs a warn on
// missing EXPO_PUBLIC_API_URL at import-time in dev).
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ServiceErrorHandler (createMeeting wraps its body in
// executeOperation + validateRequired).
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn((value: unknown, name: string) => {
      if (value === '' || value === null || value === undefined) {
        throw new Error(`${name} is required`);
      }
    }),
    executeOperation: jest.fn().mockImplementation(async (operation) => {
      const data = await operation();
      return { success: true, data };
    }),
    handleDatabaseError: jest.fn((error) => error),
  },
}));

const { supabase } = require('../../config/supabase');
const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

// An `appointments` row as the API returns it (the shape
// mapAppointmentToMeeting / createMeeting coercion consume).
const mockAppointmentRow = {
  id: 'meeting-123',
  contractor_id: 'contractor-123',
  client_id: 'homeowner-123',
  job_id: 'job-123',
  title: 'site_visit meeting',
  appointment_date: '2024-03-15',
  start_time: '14:00:00',
  end_time: '15:00:00',
  duration_minutes: 60,
  location_type: 'onsite',
  location_address: '123 Main St, New York, NY',
  status: 'scheduled',
  notes: 'Initial assessment meeting',
  created_at: '2024-03-10T10:00:00.000Z',
  updated_at: '2024-03-10T10:00:00.000Z',
  client: {
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
  },
  job: {
    id: 'job-123',
    title: 'Bathroom Renovation',
    status: 'assigned',
    latitude: 40.7128,
    longitude: -74.006,
  },
};

describe('MeetingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMeeting', () => {
    it('should create a new meeting successfully', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        appointment: mockAppointmentRow,
      });

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

      const result = await MeetingService.createMeeting(meetingData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/appointments',
        expect.objectContaining({
          jobId: 'job-123',
          appointmentDate: '2024-03-15',
        })
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('meeting-123');
      expect(result.job_id).toBe('job-123');
      expect(result.contractor_id).toBe('contractor-123');
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

      await expect(
        MeetingService.createMeeting(invalidMeetingData)
      ).rejects.toThrow();
      // Validation fails before the API is ever called.
      expect(mockedApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getMeetingById', () => {
    it('should fetch meeting by ID successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointment: mockAppointmentRow,
      });

      const result = await MeetingService.getMeetingById('meeting-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123'
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
      expect(result!.job).toBeDefined();
    });

    it('should return null for non-existent meeting', async () => {
      // No appointment in the response → mapped to null.
      mockedApiClient.get.mockResolvedValueOnce({ appointment: null });

      const result = await MeetingService.getMeetingById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on a 404 from the API', async () => {
      mockedApiClient.get.mockRejectedValueOnce({ statusCode: 404 });

      const result = await MeetingService.getMeetingById('missing');

      expect(result).toBeNull();
    });
  });

  describe('getMeetingsForUser', () => {
    it('should fetch meetings for homeowner', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointments: [mockAppointmentRow],
      });

      const result = await MeetingService.getMeetingsForUser(
        'homeowner-123',
        'homeowner'
      );

      // Homeowner reads the role-agnostic /api/appointments endpoint.
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/appointments');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].homeowner_id).toBe('homeowner-123');
    });

    it('should fetch meetings for contractor', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointments: [
          { ...mockAppointmentRow, contractor_id: 'contractor-321' },
        ],
      });

      const result = await MeetingService.getMeetingsForUser(
        'contractor-321',
        'contractor'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/appointments'
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contractor_id).toBe('contractor-321');
    });

    it('should pass a status filter on the contractor endpoint', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointments: [{ ...mockAppointmentRow, status: 'scheduled' }],
      });

      const result = await MeetingService.getMeetingsForUser(
        'contractor-123',
        'contractor',
        'scheduled'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/appointments?status=scheduled'
      );
      expect(result[0].status).toBe('scheduled');
    });
  });

  describe('updateMeetingStatus', () => {
    it('should update meeting status successfully', async () => {
      const newStatus: ContractorMeeting['status'] = 'confirmed';
      mockedApiClient.patch.mockResolvedValueOnce({
        appointment: {
          ...mockAppointmentRow,
          status: newStatus,
          notes: 'Meeting confirmed by contractor',
        },
      });

      const result = await MeetingService.updateMeetingStatus(
        'meeting-123',
        newStatus,
        'contractor-123',
        'Meeting confirmed by contractor'
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123',
        expect.objectContaining({ status: newStatus })
      );
      expect(result.status).toBe(newStatus);
      expect(result.notes).toBe('Meeting confirmed by contractor');
    });

    it('should propagate API errors', async () => {
      mockedApiClient.patch.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        MeetingService.updateMeetingStatus(
          'meeting-123',
          'confirmed',
          'user-123'
        )
      ).rejects.toThrow('Update failed');
    });
  });

  describe('rescheduleMeeting', () => {
    it('should reschedule meeting successfully', async () => {
      const newDateTime = '2024-03-16T15:00:00.000Z';
      mockedApiClient.patch.mockResolvedValueOnce({
        appointment: {
          ...mockAppointmentRow,
          appointment_date: '2024-03-16',
          start_time: '15:00:00',
          status: 'rescheduled',
          notes: 'Schedule conflict',
        },
      });

      const result = await MeetingService.rescheduleMeeting(
        'meeting-123',
        newDateTime,
        'homeowner-123',
        'Schedule conflict'
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/contractor/appointments/meeting-123',
        expect.objectContaining({ status: 'rescheduled' })
      );
      expect(result.status).toBe('rescheduled');
    });
  });

  describe('updateContractorLocation', () => {
    it('should update contractor location successfully', async () => {
      const location: LocationData = {
        latitude: 40.75,
        longitude: -73.9857,
        address: 'Times Square, NYC',
      };
      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        location: {
          id: 'location-updated',
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 10,
          timestamp: '2024-03-15T13:45:00.000Z',
        },
      });

      const result = await MeetingService.updateContractorLocation(
        'contractor-123',
        location,
        'meeting-123'
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractors/contractor-123/location',
        expect.objectContaining({
          latitude: location.latitude,
          longitude: location.longitude,
        })
      );
      expect(result.contractorId).toBe('contractor-123');
      expect(result.latitude).toBe(location.latitude);
      expect(result.longitude).toBe(location.longitude);
      expect(result.meetingId).toBe('meeting-123');
    });

    it('should handle location update errors', async () => {
      mockedApiClient.post.mockRejectedValueOnce(
        new Error('Location update failed')
      );

      const location: LocationData = { latitude: 40.75, longitude: -73.9857 };

      await expect(
        MeetingService.updateContractorLocation('contractor-123', location)
      ).rejects.toThrow('Location update failed');
    });
  });

  describe('getContractorLocation', () => {
    it('should fetch contractor location successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        location: {
          id: 'location-123',
          latitude: 40.75,
          longitude: -73.9857,
          accuracy: 10,
          timestamp: '2024-03-15T13:30:00.000Z',
          is_sharing_location: true,
        },
      });

      const result =
        await MeetingService.getContractorLocation('contractor-123');

      expect(result).toBeDefined();
      expect(result!.contractorId).toBe('contractor-123');
      expect(result!.isActive).toBe(true);
    });

    it('should return null for contractor without location', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ location: null });

      const result =
        await MeetingService.getContractorLocation('contractor-123');

      expect(result).toBeNull();
    });

    it('should return null on a 404 from the API', async () => {
      mockedApiClient.get.mockRejectedValueOnce({ statusCode: 404 });

      const result =
        await MeetingService.getContractorLocation('contractor-123');

      expect(result).toBeNull();
    });
  });

  describe('createMeetingUpdate', () => {
    // 2026-05-27 audit-78 P1: meeting_updates has no appointments-side
    // equivalent, so createMeetingUpdate is now a synthetic no-op that
    // echoes the payload back as a MeetingUpdate (no API call).
    it('should return a synthetic meeting update', async () => {
      const result = await MeetingService.createMeetingUpdate({
        meetingId: 'meeting-123',
        updateType: 'status_change' as const,
        message: 'Meeting confirmed',
        updatedBy: 'contractor-123',
        oldValue: 'scheduled',
        newValue: 'confirmed',
      });

      expect(result).toBeDefined();
      expect(result.meetingId).toBe('meeting-123');
      expect(result.updateType).toBe('status_change');
      expect(result.message).toBe('Meeting confirmed');
      // No API/DB write happens for the synthetic update.
      expect(mockedApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getMeetingUpdates', () => {
    // 2026-05-27 audit-78 P1: no timeline table → returns empty list.
    it('should return an empty list (no timeline table)', async () => {
      const result = await MeetingService.getMeetingUpdates('meeting-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up contractor location subscription', () => {
      const subscription = MeetingService.subscribeToContractorLocation(
        'contractor-123',
        jest.fn()
      );

      expect(supabase.channel).toHaveBeenCalledWith(
        'contractor_location_contractor-123'
      );
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should set up meeting updates subscription', () => {
      const subscription = MeetingService.subscribeToMeetingUpdates(
        'meeting-123',
        jest.fn()
      );

      expect(supabase.channel).toHaveBeenCalledWith('meeting_meeting-123');
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });
  });

  describe('data mapping', () => {
    it('should correctly map an appointment row to a meeting object', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        appointment: mockAppointmentRow,
      });

      const result = await MeetingService.getMeetingById('meeting-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('meeting-123');
      expect(result!.job_id).toBe('job-123');
      expect(result!.homeowner_id).toBe('homeowner-123');
      expect(result!.contractor_id).toBe('contractor-123');
      // scheduled_datetime is synthesised as `${date}T${start_time}`.
      expect(result!.scheduled_datetime).toBe('2024-03-15T14:00:00');
      expect(result!.status).toBe('scheduled');
      expect(result!.meeting_type).toBe('site_visit');
      expect(result!.address).toBe('123 Main St, New York, NY');
      expect(result!.duration).toBe(60);
      expect(result!.notes).toBe('Initial assessment meeting');
      // lat/lng carry through from the linked job.
      expect(result!.latitude).toBe(40.7128);
      expect(result!.longitude).toBe(-74.006);
      expect(result!.homeowner).toBeDefined();
      expect(result!.contractor).toBeDefined();
      expect(result!.job).toBeDefined();
    });
  });
});
