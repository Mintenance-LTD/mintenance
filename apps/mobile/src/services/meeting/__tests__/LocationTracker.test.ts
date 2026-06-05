/**
 * LocationTracker unit tests.
 *
 * Covers every exported function:
 *   - updateContractorLocation (success + fallbacks + error)
 *   - getContractorLocation (with/without jobId, response fallbacks, 404, error)
 *   - subscribeToContractorLocation (filter by jobId vs contractorId, payload
 *     narrowing, mismatch drop, null payload)
 *   - subscribeToMeetingUpdates (payload present/absent)
 *   - subscribeToContractorTravelLocation (active/inactive, mismatch, eta/context
 *     fallbacks, null payload)
 *   - startTravelTracking (success + onLocationUpdate callback, no callback,
 *     missing meeting, missing lat/lng, job_id fallback, error path)
 *   - markArrived (success, missing meeting, job_id fallback, error)
 *
 * Externals mocked: supabase realtime channel (controllable — captures the
 * postgres_changes callback so we can fire payloads), mobileApiClient, logger,
 * MeetingCRUD, JobContextLocationService.
 */

import {
  updateContractorLocation,
  getContractorLocation,
  subscribeToContractorLocation,
  subscribeToMeetingUpdates,
  subscribeToContractorTravelLocation,
  startTravelTracking,
  markArrived,
} from '../LocationTracker';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';
import {
  getMeetingById,
  updateMeetingStatus,
  createMeetingUpdate,
} from '../MeetingCRUD';
import {
  JobContextLocationService,
  ContractorLocationContext,
} from '../../JobContextLocationService';

// ---- Controllable supabase channel mock --------------------------------
// The `mock`-prefixed holder is allowed inside the jest.mock factory.
// channelMock.on captures the (config, callback) so tests can replay payloads.
const mockSupabaseState: {
  subscribeResult: { unsubscribe: jest.Mock };
  channelName?: string;
  onConfig?: any;
  onCallback?: (raw: unknown) => unknown;
} = {
  subscribeResult: { unsubscribe: jest.fn() },
};

jest.mock('../../../config/supabase', () => {
  const channelMock: any = {
    on: jest.fn(
      (_event: string, config: any, cb: (raw: unknown) => unknown) => {
        mockSupabaseState.onConfig = config;
        mockSupabaseState.onCallback = cb;
        return channelMock;
      }
    ),
    subscribe: jest.fn(() => mockSupabaseState.subscribeResult),
  };
  return {
    supabase: {
      channel: jest.fn((name: string) => {
        mockSupabaseState.channelName = name;
        return channelMock;
      }),
    },
  };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { supabase } = require('../../../config/supabase');
const subscribeResult = mockSupabaseState.subscribeResult;
const captured = mockSupabaseState;

jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../MeetingCRUD', () => ({
  getMeetingById: jest.fn(),
  updateMeetingStatus: jest.fn(),
  createMeetingUpdate: jest.fn(),
}));

// Controllable JobContextLocationService instance.
const mockStartJobTracking = jest.fn().mockResolvedValue(undefined);
const mockMarkArrivedSvc = jest.fn().mockResolvedValue(undefined);
jest.mock('../../JobContextLocationService', () => ({
  JobContextLocationService: jest.fn().mockImplementation(() => ({
    startJobTracking: mockStartJobTracking,
    markArrived: mockMarkArrivedSvc,
  })),
  ContractorLocationContext: {
    AVAILABLE: 'available',
    TRAVELING_TO_JOB: 'traveling',
    ON_JOB: 'on_job',
    OFF_DUTY: 'off_duty',
  },
}));
const startJobTracking = mockStartJobTracking;

const mockApi = mobileApiClient as jest.Mocked<typeof mobileApiClient>;
const mockGetMeeting = getMeetingById as jest.Mock;
const mockUpdateStatus = updateMeetingStatus as jest.Mock;
const mockCreateUpdate = createMeetingUpdate as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  captured.channelName = undefined;
  captured.onConfig = undefined;
  captured.onCallback = undefined;
});

// =======================================================================
describe('updateContractorLocation', () => {
  const location = { latitude: 51.5, longitude: -0.12 } as any;

  it('maps the API response onto a ContractorLocation', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      location: {
        id: 'loc-1',
        latitude: 51.51,
        longitude: -0.13,
        accuracy: 5,
        timestamp: '2026-06-05T10:00:00Z',
      },
    } as any);

    const result = await updateContractorLocation('c-1', location, 'm-1');

    expect(mockApi.post).toHaveBeenCalledWith('/api/contractors/c-1/location', {
      latitude: 51.5,
      longitude: -0.12,
    });
    expect(result).toEqual({
      id: 'loc-1',
      contractorId: 'c-1',
      latitude: 51.51,
      longitude: -0.13,
      accuracy: 5,
      timestamp: '2026-06-05T10:00:00Z',
      isActive: true,
      meetingId: 'm-1',
    });
  });

  it('falls back to inputs/defaults when the response location is empty', async () => {
    mockApi.post.mockResolvedValueOnce({ success: true } as any);

    const result = await updateContractorLocation('c-2', location);

    expect(result.id).toBe('c-2'); // falls back to contractorId
    expect(result.latitude).toBe(51.5);
    expect(result.longitude).toBe(-0.12);
    expect(result.accuracy).toBe(10); // default
    expect(typeof result.timestamp).toBe('string');
    expect(result.isActive).toBe(true);
    expect(result.meetingId).toBeNull(); // no meetingId -> null
  });

  it('encodes contractorId in the URL', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      location: null,
    } as any);
    await updateContractorLocation('a/b c', location);
    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/contractors/a%2Fb%20c/location',
      expect.any(Object)
    );
  });

  it('logs and rethrows on API failure', async () => {
    const err = new Error('boom');
    mockApi.post.mockRejectedValueOnce(err);
    await expect(updateContractorLocation('c-3', location)).rejects.toThrow(
      'boom'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error updating contractor location:',
      err
    );
  });
});

// =======================================================================
describe('getContractorLocation', () => {
  it('appends job_id query string when provided and maps the response', async () => {
    mockApi.get.mockResolvedValueOnce({
      location: {
        id: 'loc-9',
        latitude: 1,
        longitude: 2,
        accuracy: 7,
        timestamp: '2026-06-05T11:00:00Z',
        is_sharing_location: false,
      },
    } as any);

    const result = await getContractorLocation('c-1', { jobId: 'job-1' });

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/contractors/c-1/location?job_id=job-1'
    );
    expect(result).toEqual({
      id: 'loc-9',
      contractorId: 'c-1',
      latitude: 1,
      longitude: 2,
      accuracy: 7,
      timestamp: '2026-06-05T11:00:00Z',
      isActive: false, // is_sharing_location=false respected
      meetingId: null,
    });
  });

  it('omits query string and applies fallbacks (accuracy, location_timestamp, isActive)', async () => {
    mockApi.get.mockResolvedValueOnce({
      location: {
        id: 'loc-10',
        latitude: 3,
        longitude: 4,
        accuracy: null,
        location_timestamp: '2026-06-05T12:00:00Z',
      },
    } as any);

    const result = await getContractorLocation('c-2');

    expect(mockApi.get).toHaveBeenCalledWith('/api/contractors/c-2/location');
    expect(result!.accuracy).toBe(10); // null -> default 10
    expect(result!.timestamp).toBe('2026-06-05T12:00:00Z'); // location_timestamp fallback
    expect(result!.isActive).toBe(true); // undefined is_sharing_location ?? true
  });

  it('falls back to new Date when no timestamps present', async () => {
    mockApi.get.mockResolvedValueOnce({
      location: { id: 'l', latitude: 0, longitude: 0, accuracy: 1 },
    } as any);
    const result = await getContractorLocation('c-x');
    expect(typeof result!.timestamp).toBe('string');
  });

  it('returns null when response has no location', async () => {
    mockApi.get.mockResolvedValueOnce({} as any);
    expect(await getContractorLocation('c-3')).toBeNull();
  });

  it('returns null on 404 statusCode', async () => {
    mockApi.get.mockRejectedValueOnce({ statusCode: 404 });
    expect(await getContractorLocation('c-4')).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and rethrows on non-404 error', async () => {
    const err = { statusCode: 500, message: 'server' };
    mockApi.get.mockRejectedValueOnce(err);
    await expect(getContractorLocation('c-5')).rejects.toEqual(err);
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching contractor location:',
      err
    );
  });
});

// =======================================================================
describe('subscribeToContractorLocation', () => {
  const row = {
    id: 'r1',
    contractor_id: 'c-1',
    latitude: 10,
    longitude: 20,
    accuracy: 5,
    timestamp: 't',
    is_active: true,
    meeting_id: 'm-1',
  };

  it('filters by job_id and names channel with jobId when jobId provided', () => {
    const cb = jest.fn();
    const sub = subscribeToContractorLocation('c-1', cb, { jobId: 'job-7' });

    expect(supabase.channel).toHaveBeenCalledWith(
      'contractor_location_c-1_job-7'
    );
    expect(captured.onConfig.filter).toBe('job_id=eq.job-7');
    expect(sub).toBe(subscribeResult);

    captured.onCallback!({ new: row });
    expect(cb).toHaveBeenCalledWith({
      id: 'r1',
      contractorId: 'c-1',
      latitude: 10,
      longitude: 20,
      accuracy: 5,
      timestamp: 't',
      isActive: true,
      meetingId: 'm-1',
    });
  });

  it('filters by contractor_id when no jobId', () => {
    const cb = jest.fn();
    subscribeToContractorLocation('c-9', cb);
    expect(supabase.channel).toHaveBeenCalledWith('contractor_location_c-9');
    expect(captured.onConfig.filter).toBe('contractor_id=eq.c-9');
  });

  it('drops payload when new is missing', () => {
    const cb = jest.fn();
    subscribeToContractorLocation('c-1', cb);
    captured.onCallback!({ old: row });
    expect(cb).not.toHaveBeenCalled();
  });

  it('drops payload when contractor_id mismatches', () => {
    const cb = jest.fn();
    subscribeToContractorLocation('c-1', cb);
    captured.onCallback!({ new: { ...row, contractor_id: 'someone-else' } });
    expect(cb).not.toHaveBeenCalled();
  });
});

// =======================================================================
describe('subscribeToMeetingUpdates', () => {
  it('subscribes, fetches meeting on payload.new and forwards it', async () => {
    const meeting = { id: 'm-1', status: 'scheduled' } as any;
    mockGetMeeting.mockResolvedValueOnce(meeting);
    const cb = jest.fn();

    const sub = subscribeToMeetingUpdates('m-1', cb);
    expect(supabase.channel).toHaveBeenCalledWith('meeting_m-1');
    expect(captured.onConfig.filter).toBe('id=eq.m-1');
    expect(sub).toBe(subscribeResult);

    await captured.onCallback!({ new: { id: 'm-1' } });
    expect(mockGetMeeting).toHaveBeenCalledWith('m-1');
    expect(cb).toHaveBeenCalledWith(meeting);
  });

  it('does nothing when payload.new is absent', async () => {
    const cb = jest.fn();
    subscribeToMeetingUpdates('m-2', cb);
    await captured.onCallback!({ old: { id: 'm-2' } });
    expect(mockGetMeeting).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });
});

// =======================================================================
describe('subscribeToContractorTravelLocation', () => {
  const row = {
    id: 'r2',
    contractor_id: 'c-1',
    latitude: 30,
    longitude: 40,
    accuracy: 8,
    timestamp: 'ts',
    is_active: true,
    meeting_id: 'm-1',
    eta_minutes: 12,
    context: ContractorLocationContext.ON_JOB,
  };

  it('filters by meeting_id and forwards location/eta/context', () => {
    const cb = jest.fn();
    const sub = subscribeToContractorTravelLocation('m-1', 'c-1', cb);

    expect(supabase.channel).toHaveBeenCalledWith('contractor_travel_m-1');
    expect(captured.onConfig.filter).toBe('meeting_id=eq.m-1');
    expect(sub).toBe(subscribeResult);

    captured.onCallback!({ new: row });
    expect(cb).toHaveBeenCalledWith({
      location: {
        id: 'r2',
        contractorId: 'c-1',
        latitude: 30,
        longitude: 40,
        accuracy: 8,
        timestamp: 'ts',
        isActive: true,
        meetingId: 'm-1',
      },
      eta: 12,
      context: ContractorLocationContext.ON_JOB,
    });
  });

  it('applies eta=0 and TRAVELING_TO_JOB context fallbacks', () => {
    const cb = jest.fn();
    subscribeToContractorTravelLocation('m-1', 'c-1', cb);
    captured.onCallback!({
      new: { ...row, eta_minutes: undefined, context: undefined },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        eta: 0,
        context: ContractorLocationContext.TRAVELING_TO_JOB,
      })
    );
  });

  it('drops null payload', () => {
    const cb = jest.fn();
    subscribeToContractorTravelLocation('m-1', 'c-1', cb);
    captured.onCallback!({ old: row });
    expect(cb).not.toHaveBeenCalled();
  });

  it('drops payload from a different contractor', () => {
    const cb = jest.fn();
    subscribeToContractorTravelLocation('m-1', 'c-1', cb);
    captured.onCallback!({ new: { ...row, contractor_id: 'other' } });
    expect(cb).not.toHaveBeenCalled();
  });

  it('drops payload when is_active is false', () => {
    const cb = jest.fn();
    subscribeToContractorTravelLocation('m-1', 'c-1', cb);
    captured.onCallback!({ new: { ...row, is_active: false } });
    expect(cb).not.toHaveBeenCalled();
  });
});

// =======================================================================
describe('startTravelTracking', () => {
  const meeting = {
    id: 'm-1',
    job_id: 'job-1',
    latitude: 51.5,
    longitude: -0.12,
  } as any;

  it('updates status, posts an update, starts tracking and returns the service', async () => {
    mockGetMeeting.mockResolvedValueOnce(meeting);
    const onUpdate = jest.fn();

    const svc = await startTravelTracking('m-1', 'c-1', onUpdate);

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'm-1',
      'in_progress',
      'c-1',
      'Contractor started traveling to meeting location'
    );
    expect(mockCreateUpdate).toHaveBeenCalledWith({
      meetingId: 'm-1',
      updateType: 'contractor_enroute',
      message: 'Contractor is traveling to the meeting location',
      updatedBy: 'c-1',
    });
    expect(startJobTracking).toHaveBeenCalledWith(
      'c-1',
      'job-1',
      'm-1',
      { latitude: 51.5, longitude: -0.12 },
      expect.any(Function)
    );
    expect(JobContextLocationService).toHaveBeenCalledTimes(1);
    expect(svc).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith(
      'Started travel tracking for meeting',
      { meetingId: 'm-1', contractorId: 'c-1' }
    );

    // Exercise the inner onLocationUpdate callback (with consumer callback).
    const inner = startJobTracking.mock.calls[0][4];
    await inner({ coords: { latitude: 1, longitude: 2 } }, 9);
    expect(onUpdate).toHaveBeenCalledWith({
      latitude: 1,
      longitude: 2,
      eta: 9,
    });
  });

  it('inner callback is a no-op when no onLocationUpdate is provided', async () => {
    mockGetMeeting.mockResolvedValueOnce(meeting);
    await startTravelTracking('m-1', 'c-1');
    const inner = startJobTracking.mock.calls[0][4];
    await expect(
      inner({ coords: { latitude: 1, longitude: 2 } }, 5)
    ).resolves.toBeUndefined();
  });

  it('falls back to empty job_id when meeting.job_id is missing', async () => {
    mockGetMeeting.mockResolvedValueOnce({ ...meeting, job_id: undefined });
    await startTravelTracking('m-1', 'c-1');
    expect(startJobTracking).toHaveBeenCalledWith(
      'c-1',
      '',
      'm-1',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('throws when meeting not found', async () => {
    mockGetMeeting.mockResolvedValueOnce(null);
    await expect(startTravelTracking('m-1', 'c-1')).rejects.toThrow(
      'Meeting not found'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error starting travel tracking',
      expect.any(Error)
    );
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('throws when meeting location is not set', async () => {
    mockGetMeeting.mockResolvedValueOnce({ ...meeting, latitude: 0 });
    await expect(startTravelTracking('m-1', 'c-1')).rejects.toThrow(
      'Meeting location not set'
    );
  });

  it('logs and rethrows when startJobTracking fails', async () => {
    mockGetMeeting.mockResolvedValueOnce(meeting);
    const err = new Error('track-fail');
    startJobTracking.mockRejectedValueOnce(err);
    await expect(startTravelTracking('m-1', 'c-1')).rejects.toThrow(
      'track-fail'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error starting travel tracking',
      err
    );
  });
});

// =======================================================================
describe('markArrived', () => {
  const svc = {
    markArrived: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => svc.markArrived.mockClear());

  it('marks arrived on the service, updates status and posts an update', async () => {
    mockGetMeeting.mockResolvedValueOnce({ id: 'm-1', job_id: 'job-1' } as any);

    await markArrived('m-1', 'c-1', svc);

    expect(svc.markArrived).toHaveBeenCalledWith('job-1', 'm-1');
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'm-1',
      'in_progress',
      'c-1',
      'Contractor has arrived at meeting location'
    );
    expect(mockCreateUpdate).toHaveBeenCalledWith({
      meetingId: 'm-1',
      updateType: 'contractor_arrived',
      message: 'Contractor has arrived at the meeting location',
      updatedBy: 'c-1',
    });
    expect(logger.info).toHaveBeenCalledWith('Contractor marked as arrived', {
      meetingId: 'm-1',
      contractorId: 'c-1',
    });
  });

  it('falls back to empty job_id when meeting.job_id is missing', async () => {
    mockGetMeeting.mockResolvedValueOnce({ id: 'm-1' } as any);
    await markArrived('m-1', 'c-1', svc);
    expect(svc.markArrived).toHaveBeenCalledWith('', 'm-1');
  });

  it('throws when meeting not found', async () => {
    mockGetMeeting.mockResolvedValueOnce(null);
    await expect(markArrived('m-1', 'c-1', svc)).rejects.toThrow(
      'Meeting not found'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error marking contractor as arrived',
      expect.any(Error)
    );
    expect(svc.markArrived).not.toHaveBeenCalled();
  });

  it('logs and rethrows when the service markArrived fails', async () => {
    mockGetMeeting.mockResolvedValueOnce({ id: 'm-1', job_id: 'job-1' } as any);
    const err = new Error('svc-fail');
    svc.markArrived.mockRejectedValueOnce(err);
    await expect(markArrived('m-1', 'c-1', svc)).rejects.toThrow('svc-fail');
    expect(logger.error).toHaveBeenCalledWith(
      'Error marking contractor as arrived',
      err
    );
  });
});
