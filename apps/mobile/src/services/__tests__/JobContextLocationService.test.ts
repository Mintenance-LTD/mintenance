/**
 * JobContextLocationService — foreground GPS tracking for contractor live
 * "I'm on my way" (Audit P1.5 test-coverage gap, 2026-05-10).
 *
 * Pins the behaviours the audit comments call out:
 *   - permission gate (throws when foreground permission denied),
 *   - the audit-36 select-then-update-or-insert write (no upsert, because
 *     contractor_locations only has a PARTIAL unique index),
 *   - the audit-67 arrival semantics (markArrived keeps is_active=true so
 *     the homeowner card stays "Arrived"; a later stop must NOT flip it),
 *   - the audit-50 refcounted registry (one shared service per
 *     contractor/job; stop only fires when the last holder releases).
 */

const mockRequestForeground = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockWatchPosition = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: (...a: unknown[]) =>
    mockRequestForeground(...a),
  getCurrentPositionAsync: (...a: unknown[]) => mockGetCurrentPosition(...a),
  watchPositionAsync: (...a: unknown[]) => mockWatchPosition(...a),
  Accuracy: { Balanced: 3, Low: 1 },
}));

const mockBgStart = jest.fn();
const mockBgStop = jest.fn();
jest.mock('../BackgroundLocationTask', () => ({
  __esModule: true,
  BackgroundLocationTask: {
    start: (...a: unknown[]) => mockBgStart(...a),
    stop: (...a: unknown[]) => mockBgStop(...a),
  },
}));

const mockApiPost = jest.fn();
const mockApiGet = jest.fn();
const mockApiPatch = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: {
    post: (...a: unknown[]) => mockApiPost(...a),
    get: (...a: unknown[]) => mockApiGet(...a),
    patch: (...a: unknown[]) => mockApiPatch(...a),
  },
}));

jest.mock('../../utils/geohash', () => ({
  __esModule: true,
  encodeGeohash: () => 'gcpvj0u',
}));

// Controllable supabase mock (the shared manual mock lacks maybeSingle).
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
// update().eq() and update().eq().eq() must both be awaitable; eq returns a
// self-referential thenable that resolves to { error: null }.
const mockUpdateEq = jest.fn(function eq() {
  return {
    eq: mockUpdateEq,
    then: (resolve: (v: { error: null }) => unknown) =>
      resolve({ error: null }),
  };
});
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
jest.mock('../../config/supabase', () => {
  const selectChain = {
    eq: jest.fn(function eq() {
      return selectChain;
    }),
    maybeSingle: (...a: unknown[]) => mockMaybeSingle(...a),
  };
  return {
    __esModule: true,
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => selectChain),
        update: (...a: unknown[]) => mockUpdate(...a),
        insert: (...a: unknown[]) => mockInsert(...a),
      })),
    },
  };
});

import {
  JobContextLocationService,
  ContractorLocationContext,
  acquireJobTrackingService,
  releaseJobTrackingService,
} from '../JobContextLocationService';

const destination = { latitude: 51.5, longitude: -0.12 };

function sampleLocation() {
  return {
    coords: {
      latitude: 51.51,
      longitude: -0.13,
      accuracy: 5,
      heading: 90,
      speed: 8,
    },
    timestamp: Date.now(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestForeground.mockResolvedValue({ status: 'granted' });
  mockGetCurrentPosition.mockResolvedValue(sampleLocation());
  mockWatchPosition.mockResolvedValue({ remove: jest.fn() });
  mockBgStart.mockResolvedValue(true);
  mockBgStop.mockResolvedValue(undefined);
  mockApiPost.mockResolvedValue({ success: true });
  mockApiGet.mockResolvedValue({ trips: [] });
  mockApiPatch.mockResolvedValue({ success: true });
  mockMaybeSingle.mockResolvedValue({ data: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe('startJobTracking', () => {
  it('throws and does not start the watcher when permission is denied', async () => {
    mockRequestForeground.mockResolvedValueOnce({ status: 'denied' });
    const svc = new JobContextLocationService();
    await expect(
      svc.startJobTracking('c-1', 'job-1', null, destination)
    ).rejects.toThrow('Location permission not granted');
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('notifies, inserts a new row, engages the background task, and reports tracking', async () => {
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);

    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/jobs/job-1/enable-location-sharing',
      { enabled: true }
    );
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockBgStart).toHaveBeenCalledWith(
      expect.objectContaining({ contractorId: 'c-1', jobId: 'job-1' })
    );

    const status = svc.getTrackingStatus();
    expect(status.isTracking).toBe(true);
    expect(status.context).toBe(ContractorLocationContext.TRAVELING_TO_JOB);
    expect(status.jobId).toBe('job-1');
  });

  it('updates the existing active row instead of inserting', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'loc-7' } });
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'loc-7');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('continues tracking even when the notify endpoint fails', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('502'));
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
    expect(svc.getTrackingStatus().isTracking).toBe(true);
  });
});

describe('markArrived', () => {
  it('flips to ON_JOB and closes an en_route trip', async () => {
    mockApiGet.mockResolvedValueOnce({
      trips: [{ id: 'trip-1', status: 'en_route', job_id: 'job-1' }],
    });
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);

    await svc.markArrived('job-1', null);

    expect(svc.getTrackingStatus().context).toBe(
      ContractorLocationContext.ON_JOB
    );
    expect(mockApiPatch).toHaveBeenCalledWith('/api/contractor/trips/trip-1', {
      status: 'arrived',
    });
  });
});

describe('stopJobTracking', () => {
  it('marks the row inactive when the contractor never arrived', async () => {
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);
    jest.clearAllMocks();

    await svc.stopJobTracking();

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockBgStop).toHaveBeenCalled();
  });

  it('preserves is_active after arrival so the homeowner card stays "Arrived"', async () => {
    const svc = new JobContextLocationService();
    await svc.startJobTracking('c-1', 'job-1', null, destination);
    await svc.markArrived('job-1', null);
    jest.clearAllMocks();

    await svc.stopJobTracking();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockBgStop).toHaveBeenCalled();
  });
});

describe('refcounted registry', () => {
  it('hands out one shared service per (contractor, job) and stops only on last release', async () => {
    const a = acquireJobTrackingService('c-1', 'job-1');
    const b = acquireJobTrackingService('c-1', 'job-1');
    expect(a).toBe(b);

    await releaseJobTrackingService('c-1', 'job-1');
    expect(mockBgStop).not.toHaveBeenCalled();

    await releaseJobTrackingService('c-1', 'job-1');
    expect(mockBgStop).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when releasing an unknown key', async () => {
    await expect(
      releaseJobTrackingService('nobody', 'nope')
    ).resolves.toBeUndefined();
    expect(mockBgStop).not.toHaveBeenCalled();
  });
});
