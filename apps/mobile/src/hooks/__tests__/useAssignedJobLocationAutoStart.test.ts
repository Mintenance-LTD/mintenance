/**
 * useAssignedJobLocationAutoStart — auto-starts foreground live-location
 * tracking when a contractor has an en_route trip. Lifecycle-critical
 * (the chronic contractor_locations=0 P0). Mocks AppState, expo-location,
 * JobContextLocationService, mobileApiClient, useAuth, logger; uses fake
 * timers for the 2s mount delay.
 */
import { renderHook, act } from '@testing-library/react-native';

const mockGetFg = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getForegroundPermissionsAsync: (...a: unknown[]) => mockGetFg(...a),
}));

const mockRemove = jest.fn();
const mockAddEventListener = jest.fn(() => ({ remove: mockRemove }));
jest.mock('react-native', () => ({
  __esModule: true,
  AppState: {
    addEventListener: (...a: unknown[]) => mockAddEventListener(...a),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGet = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: { get: (...a: unknown[]) => mockGet(...a) },
}));

const mockStartTracking = jest.fn();
const mockGetStatus = jest.fn();
const mockAcquire = jest.fn(() => ({
  getTrackingStatus: mockGetStatus,
  startJobTracking: mockStartTracking,
}));
const mockRelease = jest.fn();
jest.mock('../../services/JobContextLocationService', () => ({
  __esModule: true,
  acquireJobTrackingService: (...a: unknown[]) => mockAcquire(...a),
  releaseJobTrackingService: (...a: unknown[]) => mockRelease(...a),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { useAssignedJobLocationAutoStart } from '../useAssignedJobLocationAutoStart';

const enRouteTrip = {
  id: 't1',
  status: 'en_route',
  job_id: 'j1',
  destination_lat: 1,
  destination_lng: 2,
  job: { id: 'j1', status: 'assigned', latitude: 1, longitude: 2 },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'contractor' } });
  mockGetFg.mockResolvedValue({ status: 'granted' });
  mockGet.mockResolvedValue({ trips: [enRouteTrip] });
  mockGetStatus.mockReturnValue({ isTracking: false });
  mockStartTracking.mockResolvedValue(undefined);
});

afterEach(() => jest.useRealTimers());

describe('mount auto-start', () => {
  it('starts tracking for an en_route trip with coordinates', async () => {
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).toHaveBeenCalledWith('u1', 'j1');
    expect(mockStartTracking).toHaveBeenCalled();
  });

  it('does nothing without foreground permission', async () => {
    mockGetFg.mockResolvedValue({ status: 'denied' });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('does nothing when the trips lookup fails', async () => {
    mockGet.mockRejectedValue(new Error('api down'));
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('does nothing when there is no en_route trip', async () => {
    mockGet.mockResolvedValue({ trips: [] });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('skips a trip with no usable coordinates', async () => {
    mockGet.mockResolvedValue({
      trips: [
        {
          ...enRouteTrip,
          destination_lat: null,
          destination_lng: null,
          job: null,
        },
      ],
    });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('skips a trip whose job is not in an active status', async () => {
    mockGet.mockResolvedValue({
      trips: [
        { ...enRouteTrip, job: { ...enRouteTrip.job, status: 'completed' } },
      ],
    });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('reuses an existing watcher without starting a new one', async () => {
    mockGetStatus.mockReturnValue({ isTracking: true });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAcquire).toHaveBeenCalled();
    expect(mockStartTracking).not.toHaveBeenCalled();
  });
});

describe('app-state + lifecycle', () => {
  it('re-checks when the app returns to the foreground', async () => {
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    const callCountAfterMount = mockGet.mock.calls.length;
    const handler = mockAddEventListener.mock.calls[0][1] as (
      s: string
    ) => void;
    await act(async () => {
      handler('active');
      await Promise.resolve();
    });
    expect(mockGet.mock.calls.length).toBeGreaterThan(callCountAfterMount);
  });

  it('does not register for non-contractors', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'homeowner' } });
    renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockAddEventListener).not.toHaveBeenCalled();
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('releases the tracking service on unmount', async () => {
    const { unmount } = renderHook(() => useAssignedJobLocationAutoStart());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    unmount();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledWith('u1', 'j1');
  });
});
