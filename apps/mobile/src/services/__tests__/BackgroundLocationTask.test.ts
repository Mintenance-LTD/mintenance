/**
 * BackgroundLocationTask — background GPS channel for contractor live
 * tracking (Audit 2026-04-16 P2 #14; test coverage gap flagged P1.5).
 *
 * Pins the fail-soft permission gate, the start/stop lifecycle against
 * expo-location, the persisted-context round-trip, and the TaskManager
 * executor's select-then-update-or-insert write (the audit-48 fix that
 * replaced a broken upsert on the partial unique index).
 */

const mockGetBackgroundPermissionsAsync = jest.fn();
const mockRequestBackgroundPermissionsAsync = jest.fn();
const mockHasStarted = jest.fn();
const mockStartUpdates = jest.fn();
const mockStopUpdates = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getBackgroundPermissionsAsync: (...a: unknown[]) =>
    mockGetBackgroundPermissionsAsync(...a),
  requestBackgroundPermissionsAsync: (...a: unknown[]) =>
    mockRequestBackgroundPermissionsAsync(...a),
  hasStartedLocationUpdatesAsync: (...a: unknown[]) => mockHasStarted(...a),
  startLocationUpdatesAsync: (...a: unknown[]) => mockStartUpdates(...a),
  stopLocationUpdatesAsync: (...a: unknown[]) => mockStopUpdates(...a),
  Accuracy: { Balanced: 3, Low: 1 },
}));

// The mock factory is hoisted above imports, so the jest.fn must be created
// inside it; we read it back off the mocked module after import to capture
// the executor registered at module load.
jest.mock('expo-task-manager', () => ({
  __esModule: true,
  defineTask: jest.fn(),
}));

type TaskExecutor = (arg: {
  data?: unknown;
  error?: { message: string } | null;
}) => Promise<void>;

const mockAsyncGetItem = jest.fn();
const mockAsyncSetItem = jest.fn();
const mockAsyncRemoveItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...a: unknown[]) => mockAsyncGetItem(...a),
    setItem: (...a: unknown[]) => mockAsyncSetItem(...a),
    removeItem: (...a: unknown[]) => mockAsyncRemoveItem(...a),
  },
}));

// Controllable supabase mock (the shared manual mock lacks maybeSingle).
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdateEq = jest.fn();
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

import * as TaskManager from 'expo-task-manager';
import {
  BackgroundLocationTask,
  BACKGROUND_LOCATION_TASK,
} from '../BackgroundLocationTask';

// The module registers its task at load — pull the executor it handed to
// TaskManager.defineTask so we can drive it directly.
const taskExecutor = (TaskManager.defineTask as jest.Mock).mock
  .calls[0]?.[1] as TaskExecutor | undefined;

const ctx = {
  contractorId: 'c-1',
  jobId: 'job-1',
  meetingId: null,
  destination: { latitude: 51.5, longitude: -0.12 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockRequestBackgroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
  });
  mockHasStarted.mockResolvedValue(false);
  mockStartUpdates.mockResolvedValue(undefined);
  mockStopUpdates.mockResolvedValue(undefined);
  mockAsyncSetItem.mockResolvedValue(undefined);
  mockAsyncRemoveItem.mockResolvedValue(undefined);
  mockMaybeSingle.mockResolvedValue({ data: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('BackgroundLocationTask.start', () => {
  it('persists context and starts updates when permission is granted', async () => {
    const ok = await BackgroundLocationTask.start(ctx);
    expect(ok).toBe(true);
    expect(mockAsyncSetItem).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(ctx)
    );
    expect(mockStartUpdates).toHaveBeenCalledWith(
      BACKGROUND_LOCATION_TASK,
      expect.objectContaining({ distanceInterval: 25 })
    );
  });

  it('requests background permission when not already granted', async () => {
    mockGetBackgroundPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined',
    });
    mockRequestBackgroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    const ok = await BackgroundLocationTask.start(ctx);
    expect(ok).toBe(true);
    expect(mockRequestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns false (no start) when background permission is denied', async () => {
    mockGetBackgroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    });
    mockRequestBackgroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    });
    const ok = await BackgroundLocationTask.start(ctx);
    expect(ok).toBe(false);
    expect(mockStartUpdates).not.toHaveBeenCalled();
  });

  it('does not double-start when the updater is already running', async () => {
    mockHasStarted.mockResolvedValueOnce(true);
    const ok = await BackgroundLocationTask.start(ctx);
    expect(ok).toBe(true);
    expect(mockStartUpdates).not.toHaveBeenCalled();
  });

  it('fails soft (returns false) when expo-location throws', async () => {
    mockGetBackgroundPermissionsAsync.mockRejectedValueOnce(new Error('boom'));
    const ok = await BackgroundLocationTask.start(ctx);
    expect(ok).toBe(false);
  });
});

describe('BackgroundLocationTask.stop', () => {
  it('stops updates when running and clears the persisted context', async () => {
    mockHasStarted.mockResolvedValueOnce(true);
    await BackgroundLocationTask.stop();
    expect(mockStopUpdates).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK);
    expect(mockAsyncRemoveItem).toHaveBeenCalled();
  });

  it('clears context even when no updater was running', async () => {
    mockHasStarted.mockResolvedValueOnce(false);
    await BackgroundLocationTask.stop();
    expect(mockStopUpdates).not.toHaveBeenCalled();
    expect(mockAsyncRemoveItem).toHaveBeenCalled();
  });
});

describe('TaskManager executor', () => {
  it('was registered at module load', () => {
    expect(taskExecutor).toBeInstanceOf(Function);
  });

  it('no-ops on a task error without writing', async () => {
    await taskExecutor!({ error: { message: 'gps fail' }, data: null });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no-ops when there is no persisted tracking context', async () => {
    mockAsyncGetItem.mockResolvedValueOnce(null);
    await taskExecutor!({
      error: null,
      data: { locations: [sampleLocation()] },
    });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('inserts a new row when no active row exists', async () => {
    mockAsyncGetItem.mockResolvedValueOnce(JSON.stringify(ctx));
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    await taskExecutor!({
      error: null,
      data: { locations: [sampleLocation()] },
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the existing active row instead of inserting', async () => {
    mockAsyncGetItem.mockResolvedValueOnce(JSON.stringify(ctx));
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'loc-9' } });
    await taskExecutor!({
      error: null,
      data: { locations: [sampleLocation()] },
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'loc-9');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

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
