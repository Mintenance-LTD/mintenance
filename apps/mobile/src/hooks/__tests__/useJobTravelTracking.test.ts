/**
 * useJobTravelTracking — contractor live-tracking hook (Audit P1.5
 * test-coverage gap, 2026-05-10). This is the job-detail consumer of the
 * audit-50 refcounted registry and the audit-69/76 AppState-gated Realtime
 * subscription that together drive the homeowner "contractor is on the way"
 * card. Tests pin:
 *   - the contractor-only guard on start / markArrived,
 *   - the registry path (acquire + start, skip-start when already running,
 *     release on stop) for the jobId branch,
 *   - the meeting path (MeetingService start/subscribe/markArrived),
 *   - location-update callback fan-out (currentLocation/eta/onLocationUpdate),
 *   - the createTrip "I'm on my way" POST + already-active-trip suppression,
 *   - markArrived → service.markArrived → stop → onArrival,
 *   - auto-start ONLY when permission is already granted (never prompts),
 *   - the job-scoped Realtime channel opening on mount,
 *   - error paths on start / stop / markArrived,
 *   - arrived-state restore from contractor_locations on mount,
 *   - cleanup on unmount (release for jobId path, stop for meeting path).
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

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  __esModule: true,
  Alert: { alert: (...a: unknown[]) => mockAlert(...a) },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

const mockGetForegroundPermissions = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getForegroundPermissionsAsync: (...a: unknown[]) =>
    mockGetForegroundPermissions(...a),
}));

const mockApiPost = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: {
    post: (...a: unknown[]) => mockApiPost(...a),
  },
}));

const mockLoggerWarn = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    warn: (...a: unknown[]) => mockLoggerWarn(...a),
    info: (...a: unknown[]) => mockLoggerInfo(...a),
    error: (...a: unknown[]) => mockLoggerError(...a),
    debug: jest.fn(),
  },
}));

// supabase.channel(...).on(...).subscribe() — chainable; unsubscribe tracked.
// supabase.from(...) — builder chain ending in maybeSingle for the
// arrived-state restore query.
const mockChannelUnsubscribe = jest.fn();
const mockMaybeSingle = jest.fn();
// Captures the postgres_changes handler registered by
// useContractorTravelRealtime so tests can drive a Realtime payload.
const mockRealtimeHandlers: unknown[] = [];
jest.mock('../../config/supabase', () => {
  const channelObj = {
    on: jest.fn(function on(...args: unknown[]) {
      const cb = args[2];
      if (typeof cb === 'function') {
        mockRealtimeHandlers.push(cb);
      }
      return channelObj;
    }),
    subscribe: jest.fn(function subscribe() {
      return channelObj;
    }),
    unsubscribe: (...a: unknown[]) => mockChannelUnsubscribe(...a),
  };
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.maybeSingle = (...a: unknown[]) => mockMaybeSingle(...a);
  return {
    __esModule: true,
    supabase: {
      channel: jest.fn(() => channelObj),
      from: jest.fn(() => builder),
    },
  };
});

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
  mockRealtimeHandlers.length = 0;
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
  mockApiPost.mockResolvedValue({ ok: true });
  mockMaybeSingle.mockResolvedValue({ data: null });
  mockMeetingStart.mockResolvedValue(fakeService());
  mockMeetingSubscribe.mockReturnValue({ unsubscribe: jest.fn() });
  mockMeetingMarkArrived.mockResolvedValue(undefined);
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

  it('rejects markArrived for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'h-1', role: 'homeowner' } });
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.markArrived();
    });
    expect(result.current.error).toBe('Only contractors can mark arrival');
    expect(mockServiceMarkArrived).not.toHaveBeenCalled();
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

  it('errors when neither jobId nor meetingId is supplied on start', async () => {
    const { result } = renderHook(() => useJobTravelTracking({ destination }));
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.error).toBe(
      'A job or meeting is required to start tracking'
    );
    expect(result.current.isTracking).toBe(false);
  });

  it('errors when the job destination coords are not finite', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({
        jobId: 'job-1',
        destination: { latitude: NaN, longitude: NaN },
      })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.error).toBe(
      'Job location is not available for tracking'
    );
    expect(mockServiceStartJob).not.toHaveBeenCalled();
  });

  // 2026-06-11 P1: a silent auto-start failure (opts.createTrip falsy)
  // must NOT pop a blocking Alert — the auto-start effect re-runs on
  // every assigned-job screen mount, so an Alert there looped a modal
  // over the contract/job screens whenever GPS was unavailable. The
  // explicit "I'm on my way" tap (createTrip: true) still alerts.
  it('does NOT Alert when a silent auto-start fails, but still sets error', async () => {
    mockServiceStartJob.mockRejectedValueOnce(
      new Error('Current location is unavailable')
    );
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.error).toBe('Current location is unavailable');
    expect(result.current.isTracking).toBe(false);
    expect(mockAlert).not.toHaveBeenCalled();
    // 2026-06-11: silent auto-start failure logs at WARN, not ERROR, so
    // it doesn't red-box in dev / Sentry-spam in prod.
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Silent travel-tracking auto-start failed (will retry)',
      expect.objectContaining({ error: 'Current location is unavailable' })
    );
    expect(mockLoggerError).not.toHaveBeenCalledWith(
      'Error starting travel tracking',
      expect.anything()
    );
  });

  it('DOES Alert + error-logs when an explicit "I\'m on my way" start fails', async () => {
    mockServiceStartJob.mockRejectedValueOnce(
      new Error('Current location is unavailable')
    );
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking({ createTrip: true });
    });
    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'Current location is unavailable'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error starting travel tracking',
      expect.anything()
    );
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

  it('propagates location updates from the service callback to state + onLocationUpdate', async () => {
    const onLocationUpdate = jest.fn();
    // Drive the service callback synchronously when startJobTracking is invoked.
    mockServiceStartJob.mockImplementation(
      async (
        _uid: string,
        _jid: string,
        _x: unknown,
        _dest: unknown,
        cb: (
          loc: { coords: { latitude: number; longitude: number } },
          eta: number
        ) => Promise<void>
      ) => {
        await cb({ coords: { latitude: 52.1, longitude: -1.2 } }, 9);
      }
    );
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination, onLocationUpdate })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.currentLocation).toEqual(
      expect.objectContaining({ latitude: 52.1, longitude: -1.2, eta: 9 })
    );
    expect(result.current.eta).toBe(9);
    expect(onLocationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 52.1, longitude: -1.2, eta: 9 })
    );
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
    expect(result.current.currentLocation).toBeNull();
    expect(result.current.eta).toBeNull();
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
    expect(result.current.hasArrived).toBe(true);
  });
});

describe('createTrip ("I\'m on my way") path', () => {
  it('POSTs to /api/contractor/trips and skips share notify on success', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking({ createTrip: true });
    });
    expect(mockApiPost).toHaveBeenCalledWith('/api/contractor/trips', {
      jobId: 'job-1',
    });
    expect(mockServiceStartJob).toHaveBeenCalledWith(
      'c-1',
      'job-1',
      null,
      destination,
      expect.any(Function),
      { skipShareNotify: true }
    );
  });

  it('treats an "already have an active trip" 400 as already-notified', async () => {
    mockApiPost.mockRejectedValue(new Error('You already have an active trip'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking({ createTrip: true });
    });
    expect(mockServiceStartJob).toHaveBeenCalledWith(
      'c-1',
      'job-1',
      null,
      destination,
      expect.any(Function),
      { skipShareNotify: true }
    );
    expect(mockLoggerWarn).not.toHaveBeenCalledWith(
      'Trip creation failed; falling back to location-sharing notify',
      expect.anything()
    );
  });

  it('falls back to share notify (skipShareNotify=false) on other trip errors', async () => {
    mockApiPost.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking({ createTrip: true });
    });
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Trip creation failed; falling back to location-sharing notify',
      expect.objectContaining({ jobId: 'job-1' })
    );
    expect(mockServiceStartJob).toHaveBeenCalledWith(
      'c-1',
      'job-1',
      null,
      destination,
      expect.any(Function),
      { skipShareNotify: false }
    );
  });
});

describe('meeting path', () => {
  it('starts tracking via MeetingService and opens a meeting subscription', async () => {
    const meetingUnsub = jest.fn();
    const onLocationUpdate = jest.fn();
    mockMeetingSubscribe.mockImplementation(
      (
        _mid: string,
        _uid: string,
        cb: (d: {
          location: { latitude: number; longitude: number; timestamp: string };
          eta: number;
        }) => void
      ) => {
        cb({
          location: { latitude: 50, longitude: 1, timestamp: 'T' },
          eta: 4,
        });
        return { unsubscribe: meetingUnsub };
      }
    );
    const { result } = renderHook(() =>
      useJobTravelTracking({
        meetingId: 'm-1',
        destination,
        onLocationUpdate,
      })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(mockMeetingStart).toHaveBeenCalledWith(
      'm-1',
      'c-1',
      expect.any(Function)
    );
    expect(mockMeetingSubscribe).toHaveBeenCalledWith(
      'm-1',
      'c-1',
      expect.any(Function)
    );
    expect(result.current.currentLocation).toEqual(
      expect.objectContaining({ latitude: 50, longitude: 1, eta: 4 })
    );
    expect(onLocationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 50, longitude: 1, eta: 4 })
    );
    expect(result.current.isTracking).toBe(true);
  });

  it('markArrived in the meeting path calls MeetingService.markArrived then stops the service', async () => {
    const { result } = renderHook(() =>
      useJobTravelTracking({ meetingId: 'm-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.markArrived();
    });
    expect(mockMeetingMarkArrived).toHaveBeenCalledWith(
      'm-1',
      'c-1',
      expect.any(Object)
    );
    // Meeting path stops the service directly (not the registry).
    expect(mockServiceStop).toHaveBeenCalledTimes(1);
    expect(mockRelease).not.toHaveBeenCalled();
    expect(result.current.hasArrived).toBe(true);
  });

  it('unsubscribes the meeting channel and stops the service on stop', async () => {
    const meetingUnsub = jest.fn();
    mockMeetingSubscribe.mockReturnValue({ unsubscribe: meetingUnsub });
    const { result } = renderHook(() =>
      useJobTravelTracking({ meetingId: 'm-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.stopTracking();
    });
    expect(meetingUnsub).toHaveBeenCalledTimes(1);
    expect(mockServiceStop).toHaveBeenCalledTimes(1);
    expect(result.current.isTracking).toBe(false);
  });
});

describe('error paths', () => {
  it('surfaces a silent start failure via error state + warn log and resets isTracking', async () => {
    mockServiceStartJob.mockRejectedValue(new Error('GPS down'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    expect(result.current.error).toBe('GPS down');
    expect(result.current.isTracking).toBe(false);
    // Silent auto-start (no createTrip): warn, not error — see 2026-06-11
    // fix so it doesn't red-box in dev / Sentry-spam in prod.
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Silent travel-tracking auto-start failed (will retry)',
      expect.objectContaining({ error: 'GPS down' })
    );
    expect(mockLoggerError).not.toHaveBeenCalledWith(
      'Error starting travel tracking',
      expect.anything()
    );
  });

  it('surfaces a stop failure via error', async () => {
    mockRelease.mockRejectedValue(new Error('release failed'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.stopTracking();
    });
    expect(result.current.error).toBe('release failed');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error stopping travel tracking',
      expect.anything()
    );
  });

  it('surfaces a markArrived failure via error + Alert', async () => {
    mockServiceMarkArrived.mockRejectedValue(new Error('arrive failed'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    await act(async () => {
      await result.current.markArrived();
    });
    expect(result.current.error).toBe('arrive failed');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error marking arrival',
      expect.anything()
    );
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

  it('applies an incoming Realtime location payload to state + onLocationUpdate', async () => {
    const onLocationUpdate = jest.fn();
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination, onLocationUpdate })
    );
    await waitFor(() => {
      expect(mockRealtimeHandlers.length).toBeGreaterThan(0);
    });
    act(() => {
      (mockRealtimeHandlers[0] as (p: unknown) => void)({
        new: {
          latitude: 53.4,
          longitude: -2.2,
          eta_minutes: 12,
          location_timestamp: '2026-06-05T00:00:00Z',
          is_active: true,
        },
      });
    });
    expect(result.current.currentLocation).toEqual(
      expect.objectContaining({ latitude: 53.4, longitude: -2.2, eta: 12 })
    );
    expect(result.current.eta).toBe(12);
    expect(onLocationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 53.4, longitude: -2.2, eta: 12 })
    );
  });
});

describe('arrived-state restore on mount', () => {
  it('sets hasArrived from an on_job contractor_locations row', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { context: 'on_job' } });
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await waitFor(() => {
      expect(result.current.hasArrived).toBe(true);
    });
    expect(supabase.from as jest.Mock).toHaveBeenCalledWith(
      'contractor_locations'
    );
  });

  it('leaves hasArrived false for a non-arrived context', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { context: 'traveling' } });
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hasArrived).toBe(false);
  });

  it('warns but does not throw when the restore query fails', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await waitFor(() => {
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'useJobTravelTracking: arrived-state restore failed',
        expect.objectContaining({ jobId: 'job-1' })
      );
    });
    expect(result.current.hasArrived).toBe(false);
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
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockServiceStartJob).not.toHaveBeenCalled();
  });

  it('does NOT auto-start once a prior arrival was restored', async () => {
    mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
    mockMaybeSingle.mockResolvedValue({ data: { context: 'on_job' } });
    const { result } = renderHook(() =>
      useJobTravelTracking({
        jobId: 'job-1',
        destination,
        autoStartIfPermitted: true,
      })
    );
    await waitFor(() => {
      expect(result.current.hasArrived).toBe(true);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockServiceStartJob).not.toHaveBeenCalled();
  });

  it('logs a warning when the auto-start permission check throws', async () => {
    mockGetForegroundPermissions.mockRejectedValue(new Error('perm boom'));
    renderHook(() =>
      useJobTravelTracking({
        jobId: 'job-1',
        destination,
        autoStartIfPermitted: true,
      })
    );
    await waitFor(() => {
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'useJobTravelTracking: auto-start permission check failed',
        expect.objectContaining({ error: 'perm boom' })
      );
    });
    expect(mockServiceStartJob).not.toHaveBeenCalled();
  });
});

describe('cleanup on unmount', () => {
  it('releases the registry reference on unmount for the jobId path', async () => {
    const { result, unmount } = renderHook(() =>
      useJobTravelTracking({ jobId: 'job-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    mockRelease.mockClear();
    unmount();
    await waitFor(() => {
      expect(mockRelease).toHaveBeenCalledWith('c-1', 'job-1');
    });
    expect(mockServiceStop).not.toHaveBeenCalled();
  });

  it('stops the service on unmount for the meeting path', async () => {
    const { result, unmount } = renderHook(() =>
      useJobTravelTracking({ meetingId: 'm-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    mockServiceStop.mockClear();
    unmount();
    await waitFor(() => {
      expect(mockServiceStop).toHaveBeenCalledTimes(1);
    });
  });

  it('logs an error when the meeting-path unmount stop rejects', async () => {
    const { result, unmount } = renderHook(() =>
      useJobTravelTracking({ meetingId: 'm-1', destination })
    );
    await act(async () => {
      await result.current.startTracking();
    });
    mockServiceStop.mockRejectedValue(new Error('cleanup failed'));
    unmount();
    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Error cleaning up location service',
        expect.anything()
      );
    });
  });
});
