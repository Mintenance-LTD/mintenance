/**
 * useJobTravelTracking — contractor live-tracking hook (Audit P1.5
 * test-coverage gap, 2026-05-10). This is the job-detail consumer of the
 * audit-50 refcounted registry and the audit-69/76 AppState-gated Realtime
 * subscription that together drive the homeowner "contractor is on the way"
 * card. Tests pin:
 *   - the contractor-only guard on start / markArrived,
 *   - the registry path (acquire + start, skip-start when already running,
 *     release on stop) for the jobId branch,
 *   - markArrived → service.markArrived → stop → onArrival,
 *   - auto-start ONLY when permission is already granted (never prompts),
 *   - the job-scoped Realtime channel opening on mount.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockServiceStartJob = jest.fn();
const mockServiceMarkArrived = jest.fn();
const mockServiceStop = jest.fn();
const mockServiceGetStatus = jest.fn();
const mockAcquire = jest.fn();
const mockRelease = jest.fn();
jest.mock('../../services/JobContextLocationService', () => ({
  __esModule: true,
  JobContextLocationService: jest.fn(),
  ContractorLocationContext: {
    AVAILABLE: 'available',
    TRAVELING_TO_JOB: 'traveling',
    ON_JOB: 'on_job',
    OFF_DUTY: 'off_duty',
  },
  acquireJobTrackingService: (...a: unknown[]) => mockAcquire(...a),
  releaseJobTrackingService: (...a: unknown[]) => mockRelease(...a),
}));

const mockMeetingStart = jest.fn();
const mockMeetingSubscribe = jest.fn();
const mockMeetingMarkArrived = jest.fn();
jest.mock('../../services/MeetingService', () => ({
  __esModule: true,
  MeetingService: {
    startTravelTracking: (...a: unknown[]) => mockMeetingStart(...a),
    subscribeToContractorTravelLocation: (...a: unknown[]) =>
      mockMeetingSubscribe(...a),
    markArrived: (...a: unknown[]) => mockMeetingMarkArrived(...a),
  },
}));

const mockGetForegroundPermissions = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getForegroundPermissionsAsync: (...a: unknown[]) =>
    mockGetForegroundPermissions(...a),
}));

// supabase.channel(...).on(...).subscribe() — chainable; unsubscribe tracked.
const mockChannelUnsubscribe = jest.fn();
jest.mock('../../config/supabase', () => {
  const channelObj = {
    on: jest.fn(function on() {
      return channelObj;
    }),
    subscribe: jest.fn(function subscribe() {
      return channelObj;
    }),
    unsubscribe: (...a: unknown[]) => mockChannelUnsubscribe(...a),
  };
  return {
    __esModule: true,
    supabase: { channel: jest.fn(() => channelObj) },
  };
});

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  __esModule: true,
  Alert: { alert: (...a: unknown[]) => mockAlert(...a) },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { supabase } from '../../config/supabase';
import { useJobTravelTracking } from '../useJobTravelTracking';

const destination = { latitude: 51.5, longitude: -0.12 };

function fakeService() {
  return {
    startJobTracking: (...a: unknown[]) => mockServiceStartJob(...a),
    markArrived: (...a: unknown[]) => mockServiceMarkArrived(...a),
    stopJobTracking: (...a: unknown[]) => mockServiceStop(...a),
    getTrackingStatus: (...a: unknown[]) => mockServiceGetStatus(...a),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'c-1', role: 'contractor' } });
  mockAcquire.mockReturnValue(fakeService());
  mockRelease.mockResolvedValue(undefined);
  mockServiceStartJob.mockResolvedValue(undefined);
  mockServiceMarkArrived.mockResolvedValue(undefined);
  mockServiceStop.mockResolvedValue(undefined);
  mockServiceGetStatus.mockReturnValue({
    isTracking: false,
    context: 'traveling',
    jobId: 'job-1',
    meetingId: null,
  });
  mockGetForegroundPermissions.mockResolvedValue({ status: 'denied' });
});

describe('guards', () => {
  it('rejects start for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'h-1', role: 'homeowner' } });
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.error).toBe(
      'Only contractors can start travel tracking'
    );
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('rejects markArrived when tracking was never started', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.markArrived();
    });
    expect(result.current.error).toBe('Tracking not started');
    expect(mockServiceMarkArrived).not.toHaveBeenCalled();
  });
});

describe('jobId registry path', () => {
  it('acquires the shared service and starts tracking when not already running', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(mockAcquire).toHaveBeenCalledWith('c-1', 'job-1');
    expect(mockServiceStartJob).toHaveBeenCalledTimes(1);
    expect(result.current.isTracking).toBe(true);
  });

  it('attaches without a second startJobTracking when a watcher is already running', async () => {
    mockServiceGetStatus.mockReturnValue({
      isTracking: true,
      context: 'traveling',
      jobId: 'job-1',
      meetingId: null,
    });
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(mockAcquire).toHaveBeenCalledWith('c-1', 'job-1');
    expect(mockServiceStartJob).not.toHaveBeenCalled();
    expect(result.current.isTracking).toBe(true);
  });

  it('releases the registry reference on stop (does not hard-stop the service)', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.stopTracking();
    });
    expect(mockRelease).toHaveBeenCalledWith('c-1', 'job-1');
    expect(mockServiceStop).not.toHaveBeenCalled();
    expect(result.current.isTracking).toBe(false);
  });

  it('marks arrival then stops and fires onArrival', async () => {
    const onArrival = jest.fn();
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination, onArrival })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.markArrived();
    });
    expect(mockServiceMarkArrived).toHaveBeenCalledWith('job-1', null);
    expect(mockRelease).toHaveBeenCalledWith('c-1', 'job-1');
    expect(onArrival).toHaveBeenCalledTimes(1);
  });
});

describe('Realtime subscription', () => {
  it('opens a job-scoped channel on mount for the jobId path', async () => {
    renderHook(() => useJobTravelTracking({ jobId: 'job-1', destination }));
    await waitFor(() => {
      expect(supabase.channel as jest.Mock).toHaveBeenCalledWith(
        'contractor_travel_job_job-1'
      );
    });
  });
});

describe('autoStartIfPermitted', () => {
  it('auto-starts when foreground permission is already granted', async () => {
    mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
    renderHook(() =>
      useJobTravelTracking({
        jobId: 'job-1',
        destination,
        autoStartIfPermitted: true,
      })
    );
    await waitFor(() => {
      expect(mockServiceStartJob).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT auto-start (never prompts) when permission is not granted', async () => {
    mockGetForegroundPermissions.mockResolvedValue({ status: 'denied' });
    renderHook(() =>
      useJobTravelTracking({
        jobId: 'job-1',
        destination,
        autoStartIfPermitted: true,
      })
    );
    // Give the async permission check a tick to resolve.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockServiceStartJob).not.toHaveBeenCalled();
  });
});
