// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type { MatchingCriteria } from '../types';

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

/**
 * Supabase query-builder mock: builder methods return the chain; the chain is
 * thenable because getAvailableContractors awaits the builder directly and
 * destructures { data, error }. .single() is also supported (assessAvailability).
 */
function buildChain(result?: { data?: unknown; error?: unknown }) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'range']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolved);
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => {
  return { serverSupabase: { from: mockFrom } };
});

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import { ContractorDataService } from '../ContractorDataService';

function makeCriteria(overrides?: Partial<MatchingCriteria>): MatchingCriteria {
  return {
    jobId: 'job-1',
    // latitude/longitude 0 => distance calculation skipped, maxDistance 0 => no cutoff
    location: { latitude: 0, longitude: 0, maxDistance: 0 },
    budget: { min: 0, max: 1000 },
    urgency: 'normal',
    requiredSkills: [],
    projectComplexity: 'simple',
    timeframe: 'this_week',
    ...overrides,
  };
}

function makeProfileRow(overrides?: Record<string, unknown>) {
  return {
    id: 'c-1',
    email: 'jane@x.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '0700',
    location: '12 High St',
    profile_image_url: null,
    role: 'contractor',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    latitude: null,
    longitude: null,
    rating: 4.8,
    total_jobs_completed: 42,
    is_available: true,
    company_name: 'Ace Plumbing',
    hourly_rate: '85.5',
    years_experience: 7,
    ...overrides,
  };
}

/** Routes from(table) to per-table chains; skills/reviews vary per contractor id. */
function arrangeTables(opts: {
  profilesChain: Record<string, any>;
  skillsByContractor?: Record<string, Array<Record<string, unknown>>>;
  reviewsByContractor?: Record<string, Array<Record<string, unknown>>>;
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return opts.profilesChain;
    if (table === 'contractor_skills') {
      const outer: Record<string, any> = {};
      outer.select = vi.fn().mockReturnValue(outer);
      outer.eq = vi.fn((_col: string, id: string) =>
        buildChain({ data: opts.skillsByContractor?.[id] ?? [] })
      );
      return outer;
    }
    if (table === 'reviews') {
      const outer: Record<string, any> = {};
      outer.select = vi.fn().mockReturnValue(outer);
      outer.eq = vi.fn((_col: string, id: string) =>
        buildChain({ data: opts.reviewsByContractor?.[id] ?? [] })
      );
      return outer;
    }
    throw new Error(`Unexpected table ${table}`);
  });
}

describe('ContractorDataService.getAvailableContractors', () => {
  it('selects from profiles with role=contractor and is_available=true (never contractor_profiles)', async () => {
    const profilesChain = buildChain({ data: [] });
    arrangeTables({ profilesChain });

    await ContractorDataService.getAvailableContractors(makeCriteria());

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(profilesChain.eq).toHaveBeenCalledWith('role', 'contractor');
    expect(profilesChain.eq).toHaveBeenCalledWith('is_available', true);
    expect(profilesChain.limit).toHaveBeenCalledWith(100);
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain('contractor_profiles');
  });

  it('maps company_name / hourly_rate / years_experience and defaults serviceRadius to 25', async () => {
    const profilesChain = buildChain({ data: [makeProfileRow()] });
    arrangeTables({
      profilesChain,
      skillsByContractor: {
        'c-1': [
          { id: 's-1', skill_name: 'Plumbing', contractor_id: 'c-1' },
          { id: 's-2', skill_name: 'Heating', contractor_id: 'c-1' },
        ],
      },
    });

    const result =
      await ContractorDataService.getAvailableContractors(makeCriteria());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'c-1',
      companyName: 'Ace Plumbing',
      hourlyRate: 85.5, // Number('85.5')
      yearsExperience: 7,
      serviceRadius: 25, // no column on profiles — hard default
      availability: 'this_week', // is_available=true bucket
      rating: 4.8,
      totalJobsCompleted: 42,
      businessAddress: '12 High St',
      specialties: ['Plumbing', 'Heating'],
    });
  });

  it('falls back to "<name> Services", null hourlyRate and created_at-derived experience', async () => {
    const profilesChain = buildChain({
      data: [
        makeProfileRow({
          company_name: null,
          hourly_rate: null,
          years_experience: null,
          total_jobs_completed: null,
        }),
      ],
    });
    arrangeTables({ profilesChain });

    const result =
      await ContractorDataService.getAvailableContractors(makeCriteria());

    expect(result[0].companyName).toBe('Jane Doe Services');
    expect(result[0].hourlyRate).toBeNull();
    // created_at 2020-01-01 => floor(years since) — time-dependent, so bound it
    expect(result[0].yearsExperience).toBeGreaterThanOrEqual(1);
    expect(result[0].totalJobsCompleted).toBe(0);
  });

  it('excludes contractors lacking the required skills', async () => {
    const profilesChain = buildChain({
      data: [
        makeProfileRow({ id: 'c-plumber' }),
        makeProfileRow({ id: 'c-spark', first_name: 'Sam' }),
      ],
    });
    arrangeTables({
      profilesChain,
      skillsByContractor: {
        'c-plumber': [
          {
            id: 's-1',
            skill_name: 'Plumbing Repair',
            contractor_id: 'c-plumber',
          },
        ],
        'c-spark': [
          { id: 's-2', skill_name: 'Electrical', contractor_id: 'c-spark' },
        ],
      },
    });

    const result = await ContractorDataService.getAvailableContractors(
      makeCriteria({ requiredSkills: ['plumbing'] })
    );

    expect(result.map((c) => c.id)).toEqual(['c-plumber']);
  });

  it('computes rating from reviews when the profile rating is missing', async () => {
    const profilesChain = buildChain({
      data: [makeProfileRow({ rating: null })],
    });
    arrangeTables({
      profilesChain,
      reviewsByContractor: {
        'c-1': [
          {
            id: 'r-1',
            rating: 5,
            comment: 'great',
            created_at: '2026-01-01',
            reviewee_id: 'c-1',
          },
          {
            id: 'r-2',
            rating: 4,
            comment: null,
            created_at: '2026-01-02',
            reviewee_id: 'c-1',
          },
        ],
      },
    });

    const result =
      await ContractorDataService.getAvailableContractors(makeCriteria());

    expect(result[0].rating).toBe(4.5);
    expect(result[0].reviews).toHaveLength(2);
  });

  it('returns [] and logs when the profiles query errors', async () => {
    const profilesChain = buildChain({ error: { message: 'boom' } });
    arrangeTables({ profilesChain });

    const result =
      await ContractorDataService.getAvailableContractors(makeCriteria());

    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get contractors',
      expect.objectContaining({ service: 'matching' })
    );
  });
});

describe('ContractorDataService.assessAvailability', () => {
  it('returns busy when profiles.is_available is false', async () => {
    const chain = buildChain({ data: { is_available: false } });
    mockFrom.mockReturnValue(chain);

    const result = await ContractorDataService.assessAvailability(
      'abcd',
      'immediate'
    );

    expect(result).toBe('busy');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(chain.select).toHaveBeenCalledWith('is_available');
    expect(chain.eq).toHaveBeenCalledWith('id', 'abcd');
    expect(chain.single).toHaveBeenCalled();
  });

  it('falls through to the deterministic timeframe hash when is_available is true', async () => {
    const chain = buildChain({ data: { is_available: true } });
    mockFrom.mockReturnValue(chain);

    // 'abcd' char codes sum to 394; 'immediate' bias 0 => 394 % 4 = 2 => 'this_month'
    const result = await ContractorDataService.assessAvailability(
      'abcd',
      'immediate'
    );

    expect(result).toBe('this_month');
  });

  it('falls through to the hash when no profile row exists', async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    // 'aaab' sums to 389; 'flexible' bias 3 => 392 % 4 = 0 => 'immediate'
    const result = await ContractorDataService.assessAvailability(
      'aaab',
      'flexible'
    );

    expect(result).toBe('immediate');
  });

  it('returns the this_week fallback when the query throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('connection lost');
    });

    const result = await ContractorDataService.assessAvailability(
      'abcd',
      'immediate'
    );

    expect(result).toBe('this_week');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to assess availability',
      expect.objectContaining({ contractorId: 'abcd', service: 'matching' })
    );
  });
});
