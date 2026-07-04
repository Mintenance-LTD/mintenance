// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type { AdvancedSearchFilters } from '@mintenance/types';

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

/**
 * Builds a Supabase query-builder mock. Every builder method returns the
 * chain itself; the chain is *thenable* because these services await the
 * builder directly (no .single()) and destructure { data, error, count }.
 */
function buildChain(result?: {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
    count: result?.count ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'or',
    'in',
    'gte',
    'lte',
    'overlaps',
    'contains',
    'order',
    'limit',
    'range',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
    data: resolved.data,
    error: resolved.error,
  });
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// Passthrough so .or() assertions are deterministic (real impl needs DOMPurify/jsdom)
vi.mock('@/lib/sanitizer', () => ({
  sanitizeForSQL: (s: string) => s,
}));

import { AdvancedSearchService } from '../AdvancedSearchService';

const EMPTY_FACETS = {
  skills: {},
  priceRanges: {},
  ratings: {},
  locations: {},
  availability: {},
};

function makeFilters(
  overrides?: Partial<AdvancedSearchFilters>
): AdvancedSearchFilters {
  return {
    skills: [],
    availability: 'flexible',
    projectTypes: [],
    ...overrides,
  };
}

/** First from() call serves the search, second serves the facets query. */
function arrangeSearch(
  searchChain: Record<string, any>,
  facetsChain: Record<string, any> = buildChain({ data: [] })
) {
  mockFrom.mockReturnValueOnce(searchChain).mockReturnValueOnce(facetsChain);
}

describe('AdvancedSearchService.searchContractors', () => {
  it('queries profiles with role=contractor and never touches contractor_profiles', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors('', makeFilters());

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(chain.eq).toHaveBeenCalledWith('role', 'contractor');
    const tablesQueried = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesQueried).not.toContain('contractor_profiles');
  });

  it('builds the or() clause with skills containment and bio ilike for text queries', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors('kitchen', makeFilters());

    expect(chain.or).toHaveBeenCalledWith(
      'bio.ilike.%kitchen%,skills.cs.{kitchen}'
    );
  });

  it('skips the or() clause when the query is blank', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors('   ', makeFilters());

    expect(chain.or).not.toHaveBeenCalled();
  });

  it('applies hourly_rate min/max filters from priceRange and overlaps for skills', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors(
      '',
      makeFilters({
        priceRange: { min: 25, max: 80 },
        skills: ['plumbing', 'heating'],
      })
    );

    expect(chain.gte).toHaveBeenCalledWith('hourly_rate', 25);
    expect(chain.lte).toHaveBeenCalledWith('hourly_rate', 80);
    expect(chain.overlaps).toHaveBeenCalledWith('skills', [
      'plumbing',
      'heating',
    ]);
  });

  it('maps non-flexible availability preference to eq(is_available, true)', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors(
      '',
      makeFilters({ availability: 'immediate' })
    );

    expect(chain.eq).toHaveBeenCalledWith('is_available', true);
  });

  it('does not filter on is_available when availability is flexible', async () => {
    const chain = buildChain({ data: [], count: 0 });
    arrangeSearch(chain);

    await AdvancedSearchService.searchContractors('', makeFilters());

    const eqColumns = chain.eq.mock.calls.map((c: unknown[]) => c[0]);
    expect(eqColumns).not.toContain('is_available');
  });

  it('maps flat profiles rows to the ContractorProfile result shape', async () => {
    const rows = [
      {
        id: 'c-1',
        email: 'busy@x.com',
        first_name: 'Bea',
        last_name: 'Busy',
        phone: '0700',
        avatar_url: 'http://img/a.png',
        bio: 'Kitchens a specialty',
        skills: ['plumbing'],
        hourly_rate: 55,
        years_experience: 12,
        rating: 4.8,
        is_available: false,
        total_jobs_completed: 87,
        portfolio_images: ['p1.jpg'],
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        // Sparse row exercises every fallback
        id: 'c-2',
        email: null,
        first_name: null,
        last_name: null,
        phone: null,
        avatar_url: null,
        bio: null,
        skills: null,
        hourly_rate: null,
        years_experience: null,
        rating: null,
        is_available: true,
        total_jobs_completed: null,
        portfolio_images: null,
        created_at: '2021-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    arrangeSearch(buildChain({ data: rows, count: 2 }));

    const result = await AdvancedSearchService.searchContractors(
      '',
      makeFilters()
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'c-1',
      role: 'contractor',
      bio: 'Kitchens a specialty',
      skills: ['plumbing'],
      hourly_rate: 55,
      experience_years: 12, // <- years_experience
      availability: 'busy', // <- is_available === false
      rating: 4.8,
      total_jobs: 87, // <- total_jobs_completed
      portfolioImages: ['p1.jpg'],
      reviews: [],
    });
    expect(result.items[1]).toMatchObject({
      id: 'c-2',
      email: '',
      first_name: '',
      skills: [],
      hourly_rate: 0,
      experience_years: 0,
      availability: 'flexible', // <- is_available true
      rating: 0,
      total_jobs: 0,
      portfolioImages: [],
    });
  });

  it('returns totalCount and hasMore from the count', async () => {
    arrangeSearch(buildChain({ data: [], count: 45 }));

    const result = await AdvancedSearchService.searchContractors(
      '',
      makeFilters(),
      1,
      20
    );

    expect(result.totalCount).toBe(45);
    expect(result.hasMore).toBe(true); // 45 > 0 + 20
  });

  it('returns an empty result with empty facets when the search errors', async () => {
    arrangeSearch(buildChain({ error: { message: 'boom' } }));

    const result = await AdvancedSearchService.searchContractors(
      'x',
      makeFilters()
    );

    expect(result).toEqual({
      items: [],
      totalCount: 0,
      hasMore: false,
      facets: EMPTY_FACETS,
      suggestions: [],
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error searching contractors',
      expect.anything()
    );
  });
});

describe('AdvancedSearchService contractor facets (via searchContractors)', () => {
  it('buckets availability on the is_available boolean and counts skills/rates/ratings', async () => {
    const facetRows = [
      {
        skills: ['Plumbing', 'Heating'],
        hourly_rate: 40,
        rating: 5,
        is_available: true,
      },
      {
        skills: ['Plumbing'],
        hourly_rate: 90,
        rating: 4.5,
        is_available: false,
      },
      { skills: null, hourly_rate: null, rating: null, is_available: null },
    ];
    const facetsChain = buildChain({ data: facetRows });
    arrangeSearch(buildChain({ data: [], count: 0 }), facetsChain);

    const result = await AdvancedSearchService.searchContractors(
      '',
      makeFilters()
    );

    // facets query reads canonical profiles with the contractor role filter
    expect(facetsChain.select).toHaveBeenCalledWith(
      'skills, hourly_rate, rating, is_available'
    );
    expect(facetsChain.eq).toHaveBeenCalledWith('role', 'contractor');

    expect(result.facets.availability).toEqual({
      available: 2, // true + null both bucket as available
      unavailable: 1, // is_available === false
    });
    expect(result.facets.skills).toEqual({ Plumbing: 2, Heating: 1 });
    expect(result.facets.priceRanges).toEqual({
      '$25-$50/hr': 2, // 40 and the null-rate row (0 falls in lowest bucket)
      '$50-$75/hr': 0,
      '$75-$100/hr': 1,
      '$100+/hr': 0,
    });
    expect(result.facets.ratings).toEqual({
      '5 stars': 1,
      '4+ stars': 2,
      '3+ stars': 2,
    });
  });

  it('returns empty facets when the facets query errors, keeping search items', async () => {
    const row = {
      id: 'c-1',
      email: 'a@b.c',
      first_name: 'A',
      last_name: 'B',
      created_at: '2020-01-01',
      updated_at: '2026-01-01',
      is_available: true,
    };
    arrangeSearch(
      buildChain({ data: [row], count: 1 }),
      buildChain({ error: { message: 'facets down' } })
    );

    const result = await AdvancedSearchService.searchContractors(
      '',
      makeFilters()
    );

    expect(result.items).toHaveLength(1);
    expect(result.facets).toEqual(EMPTY_FACETS);
  });
});
