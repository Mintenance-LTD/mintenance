// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * DBSCheckService — schema correctness and the date-of-birth guard.
 *
 * 2026-08-02: the contractor lookup selected `date_of_birth`,
 * `address_line1`, `address_line2` and `postal_code` from `profiles`.
 * NONE of those columns exist (verified against the live schema — the real
 * ones are `address`, `city`, `postcode`, `country`), so PostgREST rejected
 * the entire select and every DBS attempt failed as a misleading
 * "Contractor not found".
 *
 * Fixing the column names alone would have been WORSE than the bug: the
 * service posts to live criminal-record providers, and date of birth is
 * what identifies the individual.
 *
 * 2026-08-05 (UK market readiness Task 2): DOB is now captured during UK
 * tax onboarding and stored ENCRYPTED on `profiles.date_of_birth_encrypted`.
 * The service selects that column and decrypts it. A contractor who has not
 * completed tax onboarding still has no DOB on file, so the guard continues
 * to refuse (explicitly) rather than submit an undefined DOB.
 */
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  fetch: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...a: unknown[]) => mocks.from(...a) },
}));
vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

import { DBSCheckService } from '@/lib/services/verification/DBSCheckService';

/** profiles lookup: .select().eq().single() */
function mockProfilesReturning(row: Record<string, unknown> | null) {
  const selectSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: row,
        error: row ? null : { message: 'not found' },
      }),
    }),
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: selectSpy };
    // Any other table (e.g. contractor_dbs_checks) — unreached in these
    // tests because the DOB guard returns first.
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    };
  });
  return selectSpy;
}

const CONTRACTOR = {
  id: 'c-1',
  first_name: 'Sam',
  last_name: 'Fixit',
  email: 'sam@example.com',
  phone: '+447700900000',
  role: 'contractor',
  address: '65 Gloucester Road',
  city: 'Cheltenham',
  postcode: 'GL50 1AB',
  country: 'GB',
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mocks.fetch as unknown as typeof global.fetch;
});

describe('DBSCheckService.initiateCheck', () => {
  it('selects only columns that exist on profiles', async () => {
    const selectSpy = mockProfilesReturning(CONTRACTOR);

    await DBSCheckService.initiateCheck('c-1', 'basic');

    const selected = selectSpy.mock.calls[0][0] as string;
    // The columns that broke the query (none of these exist on profiles).
    expect(selected).not.toMatch(/address_line1/);
    expect(selected).not.toMatch(/address_line2/);
    expect(selected).not.toMatch(/postal_code/);
    // DOB is now captured ENCRYPTED — the guard reads the real column, not a
    // bare (non-existent) `date_of_birth`.
    expect(selected).toMatch(/date_of_birth_encrypted/);
    // The real address columns.
    expect(selected).toMatch(/\baddress\b/);
    expect(selected).toMatch(/\bpostcode\b/);
    expect(selected).toMatch(/\bcity\b/);
  });

  it('refuses to submit a check when date of birth is unavailable', async () => {
    mockProfilesReturning(CONTRACTOR); // no date_of_birth — none is collected

    const result = await DBSCheckService.initiateCheck('c-1', 'basic');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/date of birth/i);
    // The safety property: nothing was sent to a background-check provider.
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does not mislabel the DOB gap as a missing contractor', async () => {
    mockProfilesReturning(CONTRACTOR);

    const result = await DBSCheckService.initiateCheck('c-1', 'basic');

    expect(result.error).not.toMatch(/not found/i);
  });

  it('still rejects a genuinely missing contractor', async () => {
    mockProfilesReturning(null);

    const result = await DBSCheckService.initiateCheck('missing', 'basic');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('still rejects a non-contractor before the DOB guard', async () => {
    mockProfilesReturning({ ...CONTRACTOR, role: 'homeowner' });

    const result = await DBSCheckService.initiateCheck('c-1', 'basic');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/only available for contractors/i);
  });
});
