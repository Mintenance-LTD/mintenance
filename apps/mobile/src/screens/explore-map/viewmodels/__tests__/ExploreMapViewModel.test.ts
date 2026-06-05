/**
 * Unit tests for useExploreMapViewModel (JobsMap ViewModel).
 *
 * The ViewModel is a hook of plain business logic. We mock only its
 * externals: expo-location, mobileApiClient, logger, and useAuth.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---- Mocks (declared before importing the unit under test) ----

const mockGet = jest.fn();
jest.mock('@/utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
// jest.config maps every `contexts/AuthContext` import to AuthContext-fallback,
// so the source's useAuth actually resolves to the fallback module. Mock that.
jest.mock('@/contexts/AuthContext-fallback', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

const mockGetForegroundPermissionsAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: (...a: unknown[]) =>
    mockGetForegroundPermissionsAsync(...a),
  requestForegroundPermissionsAsync: (...a: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...a),
  getCurrentPositionAsync: (...a: unknown[]) =>
    mockGetCurrentPositionAsync(...a),
  Accuracy: { Balanced: 3 },
}));

import { useExploreMapViewModel } from '../ExploreMapViewModel';

// ---- Helpers ----

function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    title: 'Fix leaking tap',
    category: 'plumbing',
    urgency: 'high',
    budget: 100,
    budget_min: 80,
    budget_max: 120,
    latitude: 51.51,
    longitude: -0.13,
    created_at: '2026-01-01T00:00:00Z',
    homeowner_first_name: 'Alice',
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no signed-in user (skips the profile-coords branch on mount)
  mockUseAuth.mockReturnValue({ user: null });
  // Default: location permission denied so mount settles on London default
  mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
  mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
  mockGetCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 51.5, longitude: -0.12 },
  });
  // Default discover response: empty list
  mockGet.mockResolvedValue({ jobs: [] });
});

describe('useExploreMapViewModel — initial state & defaults', () => {
  it('initializes with London default region and empty derived state', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());

    expect(result.current.region).toEqual({
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    });
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedJob).toBeNull();
    expect(result.current.selectedCategory).toBeNull();
    expect(result.current.userLocation).toBeNull();

    // fetchJobs runs on mount; wait for loading to settle
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toEqual([]);
    expect(result.current.jobCount).toBe(0);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.verificationRequired).toBe(false);
  });

  it('sends discover request with limit + region lat/lng/radius params', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGet).toHaveBeenCalled();
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('/api/jobs/discover?');
    expect(url).toContain('limit=50');
    expect(url).toContain('latitude=51.5074');
    expect(url).toContain('longitude=-0.1278');
    expect(url).toContain('radiusKm=25');
    expect(url).not.toContain('category=');
  });
});

describe('useExploreMapViewModel — fetch success / mapping / sorting', () => {
  it('maps rows, coerces numeric strings, sorts by distance', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        // far away (Manchester-ish)
        makeRow({
          id: 'far',
          latitude: '53.48',
          longitude: '-2.24',
          budget: '500',
        }),
        // close to London default
        makeRow({ id: 'near', latitude: 51.508, longitude: -0.128 }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toHaveLength(2);
    // sorted ascending by distance => near first
    expect(result.current.jobs[0].id).toBe('near');
    expect(result.current.jobs[1].id).toBe('far');
    expect(typeof result.current.jobs[0].budget).toBe('number');
    expect(result.current.jobs[1].budget).toBe(500);
    expect(result.current.jobs[0].distance).toBeGreaterThanOrEqual(0);
  });

  it('applies category/urgency/homeowner_name fallbacks', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        makeRow({
          category: null,
          urgency: null,
          homeowner_first_name: null,
          created_at: null,
          budget: null,
          budget_min: null,
          budget_max: null,
        }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const job = result.current.jobs[0];
    expect(job.category).toBe('general');
    expect(job.urgency).toBe('medium');
    expect(job.homeowner_name).toBe('Homeowner');
    expect(job.created_at).toBe('');
    expect(job.budget).toBeNull();
  });

  it('drops rows with missing/invalid coordinates', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        makeRow({ id: 'no-lat', latitude: null }),
        makeRow({ id: 'bad-lng', longitude: 'not-a-number' }),
        makeRow({ id: 'good', latitude: 51.6, longitude: -0.1 }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].id).toBe('good');
  });

  it('jitters pins that share identical coordinates', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        makeRow({ id: 'a', latitude: 51.55, longitude: -0.1 }),
        makeRow({ id: 'b', latitude: 51.55, longitude: -0.1 }),
        makeRow({ id: 'c', latitude: 51.55, longitude: -0.1 }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const coords = result.current.jobs.map(
      (j) => `${j.latitude},${j.longitude}`
    );
    // After jittering, the 3 pins should no longer all be identical
    expect(new Set(coords).size).toBeGreaterThan(1);
  });

  it('handles a response missing the jobs array (response.jobs ?? [])', async () => {
    mockGet.mockResolvedValue({});
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toEqual([]);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useExploreMapViewModel — error branches', () => {
  it('surfaces a generic retry message on discover failure', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual([]);
    expect(result.current.errorMessage).toBe(
      'Could not load nearby jobs. Tap to retry.'
    );
  });

  it('surfaces an auth-specific message on 401/403', async () => {
    mockGet.mockRejectedValue({ statusCode: 403 });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errorMessage).toBe(
      'You are signed out or do not have access to job discovery.'
    );
  });

  it('reads the alternate `status` field for the error code (401)', async () => {
    mockGet.mockRejectedValue({ status: 401 });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errorMessage).toBe(
      'You are signed out or do not have access to job discovery.'
    );
  });

  it('hits the outer catch when post-fetch processing throws (jobs not an array)', async () => {
    // response.jobs is truthy-but-not-an-array -> `data.map` throws,
    // exercising the outer try/catch (lines ~365-374).
    mockGet.mockResolvedValue({ jobs: 12345 });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual([]);
    expect(result.current.errorMessage).toBe(
      'Could not load nearby jobs. Tap to retry.'
    );
  });
});

describe('useExploreMapViewModel — verification gate', () => {
  it('sets verificationRequired on CONTRACTOR_NOT_VERIFIED', async () => {
    mockGet.mockResolvedValue({ jobs: [], code: 'CONTRACTOR_NOT_VERIFIED' });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.verificationRequired).toBe(true);
    expect(result.current.jobs).toEqual([]);
  });

  it('clears verificationRequired once a normal response arrives', async () => {
    mockGet.mockResolvedValueOnce({
      jobs: [],
      code: 'CONTRACTOR_NOT_VERIFIED',
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.verificationRequired).toBe(true));

    mockGet.mockResolvedValue({ jobs: [makeRow()] });
    await act(async () => {
      result.current.refreshJobs();
    });
    await waitFor(() =>
      expect(result.current.verificationRequired).toBe(false)
    );
    expect(result.current.jobs.length).toBeGreaterThan(0);
  });
});

describe('useExploreMapViewModel — region change & panning', () => {
  it('updates region and sets hasPanned after initial load', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPanned).toBe(false);

    const newRegion = {
      latitude: 52,
      longitude: -1,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
    act(() => {
      result.current.handleRegionChange(newRegion);
    });
    expect(result.current.region).toEqual(newRegion);
    expect(result.current.hasPanned).toBe(true);
  });
});

describe('useExploreMapViewModel — search & category selectors', () => {
  it('filters jobs by search query (title or category match)', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        makeRow({ id: 'tap', title: 'Fix leaking tap', category: 'plumbing' }),
        makeRow({
          id: 'light',
          title: 'Install light',
          category: 'electrical',
          latitude: 51.52,
        }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toHaveLength(2);

    act(() => result.current.handleSearch('light'));
    expect(result.current.searchQuery).toBe('light');
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].id).toBe('light');

    // category-substring match
    act(() => result.current.handleSearch('plumb'));
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].id).toBe('tap');

    // no match
    act(() => result.current.handleSearch('zzzz'));
    expect(result.current.jobs).toHaveLength(0);
  });

  it('selects a job and clears it', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const job = makeRow() as never;
    act(() => result.current.handleJobSelect(job));
    expect(result.current.selectedJob).toBe(job);
    act(() => result.current.handleJobSelect(null));
    expect(result.current.selectedJob).toBeNull();
  });

  it('selecting a category re-fetches with category param and filters client-side', async () => {
    mockGet.mockResolvedValue({
      jobs: [
        makeRow({ id: 'p', category: 'plumbing' }),
        makeRow({ id: 'e', category: 'Electrical', latitude: 51.53 }),
      ],
    });
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.handleCategorySelect('plumbing');
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // category param is included on the re-fetch
    const lastUrl = mockGet.mock.calls[
      mockGet.mock.calls.length - 1
    ][0] as string;
    expect(lastUrl).toContain('category=plumbing');

    // client-side filter keeps only the case-insensitive matching category
    expect(
      result.current.jobs.every((j) => j.category.toLowerCase() === 'plumbing')
    ).toBe(true);
  });

  it('logs when the filter button is pressed', async () => {
    const { logger } = jest.requireMock('@/utils/logger') as {
      logger: { info: jest.Mock };
    };
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleFilterPress());
    expect(logger.info).toHaveBeenCalledWith('Filter button pressed');
  });
});

describe('useExploreMapViewModel — searchInRegion & refreshJobs', () => {
  it('searchInRegion resets hasPanned and re-fetches', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleRegionChange({
        latitude: 53,
        longitude: -2,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      });
    });
    expect(result.current.hasPanned).toBe(true);

    const callsBefore = mockGet.mock.calls.length;
    await act(async () => {
      result.current.searchInRegion();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPanned).toBe(false);
    expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('refreshJobs re-issues the discover request', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = mockGet.mock.calls.length;

    await act(async () => {
      result.current.refreshJobs();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('useExploreMapViewModel — location init on mount (profile coords path)', () => {
  it('centers on saved profile coordinates when user has them', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/users/profile') {
        return Promise.resolve({
          profile: { latitude: '52.2', longitude: '-1.5' },
        });
      }
      return Promise.resolve({ jobs: [] });
    });

    const { result } = renderHook(() => useExploreMapViewModel());

    await waitFor(() =>
      expect(result.current.userLocation).toEqual({
        latitude: 52.2,
        longitude: -1.5,
      })
    );
    expect(result.current.region.latitude).toBe(52.2);
    expect(result.current.region.longitude).toBe(-1.5);
    // GPS should not be consulted when profile coords win
    expect(mockGetForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('falls through to GPS when profile coords are non-finite', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/users/profile') {
        return Promise.resolve({
          profile: { latitude: 'NaNlat', longitude: null },
        });
      }
      return Promise.resolve({ jobs: [] });
    });
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 50.1, longitude: -3.3 },
    });

    const { result } = renderHook(() => useExploreMapViewModel());

    await waitFor(() =>
      expect(result.current.userLocation).toEqual({
        latitude: 50.1,
        longitude: -3.3,
      })
    );
    expect(result.current.locationGranted).toBe(true);
  });

  it('falls through to GPS when the profile request throws', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/users/profile') {
        return Promise.reject(new Error('profile 500'));
      }
      return Promise.resolve({ jobs: [] });
    });
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 48.0, longitude: 2.0 },
    });

    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() =>
      expect(result.current.userLocation).toEqual({
        latitude: 48.0,
        longitude: 2.0,
      })
    );
  });

  it('requests permission when not already granted, then reads GPS', async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40, longitude: 5 },
    });

    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() =>
      expect(result.current.userLocation).toEqual({
        latitude: 40,
        longitude: 5,
      })
    );
    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.current.locationGranted).toBe(true);
  });

  it('stays on default region when GPS permission is denied', async () => {
    // beforeEach already sets denied
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userLocation).toBeNull();
    expect(result.current.locationGranted).toBe(false);
    expect(result.current.region.latitude).toBe(51.5074);
  });

  it('logs a warning when location init throws', async () => {
    const { logger } = jest.requireMock('@/utils/logger') as {
      logger: { warn: jest.Mock };
    };
    mockGetForegroundPermissionsAsync.mockRejectedValue(new Error('loc fail'));
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(logger.warn).toHaveBeenCalledWith(
      'Location initialisation failed',
      expect.any(Error)
    );
  });
});

describe('useExploreMapViewModel — centerOnUser', () => {
  it('reads GPS and recenters the map, clearing hasPanned', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // pan first so hasPanned is true
    act(() => {
      result.current.handleRegionChange({
        latitude: 10,
        longitude: 10,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      });
    });
    expect(result.current.hasPanned).toBe(true);

    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 55.5, longitude: -4.4 },
    });

    await act(async () => {
      await result.current.centerOnUser();
    });

    expect(result.current.userLocation).toEqual({
      latitude: 55.5,
      longitude: -4.4,
    });
    expect(result.current.region.latitude).toBe(55.5);
    expect(result.current.hasPanned).toBe(false);
    expect(result.current.locationGranted).toBe(true);
  });

  it('requests permission inside centerOnUser when not granted', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 33, longitude: 44 },
    });

    await act(async () => {
      await result.current.centerOnUser();
    });
    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.current.userLocation).toEqual({
      latitude: 33,
      longitude: 44,
    });
  });

  it('does nothing visible when centerOnUser permission stays denied', async () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    await act(async () => {
      await result.current.centerOnUser();
    });
    expect(result.current.userLocation).toBeNull();
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('warns when centerOnUser throws', async () => {
    const { logger } = jest.requireMock('@/utils/logger') as {
      logger: { warn: jest.Mock };
    };
    const { result } = renderHook(() => useExploreMapViewModel());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetForegroundPermissionsAsync.mockRejectedValue(
      new Error('center fail')
    );
    await act(async () => {
      await result.current.centerOnUser();
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not get current location',
      expect.any(Error)
    );
  });
});
