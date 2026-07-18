// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const { mockRpc, mockFrom, mockLoggerWarn } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

/**
 * Supabase query-builder mock for the legacy-scan path: builder methods
 * return the chain; the chain is thenable because the scan awaits the
 * builder directly and destructures { data, error }.
 */
function buildChain(result?: { data?: unknown; error?: unknown }) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of ['select', 'eq', 'not', 'in', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mockRpc, from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() },
}));

import { fetchNearbyContractors } from '../job-notification-audience';

const CHELTENHAM = { lat: 51.9, lng: -2.07 };

describe('fetchNearbyContractors (service-area-aware audience)', () => {
  it('maps RPC rows: id, numeric-coerced distance, matched_via, prefs', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          contractor_id: 'c-sa',
          distance_km: '0.186',
          matched_via: 'service_area',
          preferred_days: ['monday', 'friday'],
          preferred_hours: { start: '09:00', end: '17:00' },
        },
        {
          contractor_id: 'c-fallback',
          distance_km: 12.5,
          matched_via: 'profile_radius',
          preferred_days: null,
          preferred_hours: null,
        },
      ],
      error: null,
    });

    const result = await fetchNearbyContractors(CHELTENHAM);

    expect(result).toEqual([
      {
        id: 'c-sa',
        distanceKm: 0.186,
        matchedVia: 'service_area',
        preferredDays: ['monday', 'friday'],
        preferredHours: { start: '09:00', end: '17:00' },
      },
      {
        id: 'c-fallback',
        distanceKm: 12.5,
        matchedVia: 'profile_radius',
        preferredDays: null,
        preferredHours: null,
      },
    ]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('nulls out malformed preferred_hours payloads', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          contractor_id: 'c-sa',
          distance_km: 1,
          matched_via: 'service_area',
          preferred_days: [],
          preferred_hours: 'nine to five',
        },
      ],
      error: null,
    });

    const result = await fetchNearbyContractors(CHELTENHAM);

    expect(result[0].preferredDays).toBeNull();
    expect(result[0].preferredHours).toBeNull();
  });

  it('sends the default radius and the job city to the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await fetchNearbyContractors(CHELTENHAM, 'Cheltenham');

    expect(mockRpc).toHaveBeenCalledWith('find_contractors_for_job', {
      p_latitude: CHELTENHAM.lat,
      p_longitude: CHELTENHAM.lng,
      p_default_radius_km: 25,
      p_city: 'Cheltenham',
    });
  });

  it('defaults p_city to null when no city is known', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await fetchNearbyContractors(CHELTENHAM);

    expect(mockRpc).toHaveBeenCalledWith(
      'find_contractors_for_job',
      expect.objectContaining({ p_city: null })
    );
  });

  it('falls back to the legacy 25km Haversine scan when the RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function find_contractors_for_job does not exist' },
    });
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          // ~0km away — kept
          { id: 'c-near', latitude: 51.9, longitude: -2.07 },
          // London, ~150km away — dropped by the 25km cutoff
          { id: 'c-far', latitude: 51.5, longitude: -0.12 },
          // NUMERIC-as-string coords — coerced, kept
          { id: 'c-string', latitude: '51.91', longitude: '-2.06' },
          // unparseable coords — dropped
          { id: 'c-bad', latitude: 'not-a-number', longitude: null },
        ],
        error: null,
      })
    );

    const result = await fetchNearbyContractors(CHELTENHAM);

    expect(result.map((c) => c.id)).toEqual(['c-near', 'c-string']);
    expect(result.every((c) => c.matchedVia === 'legacy_scan')).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('RPC unavailable'),
      expect.objectContaining({ service: 'jobs' })
    );
  });

  it('returns [] when both the RPC and the legacy scan fail', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: 'db down' } })
    );

    const result = await fetchNearbyContractors(CHELTENHAM);

    expect(result).toEqual([]);
  });
});
