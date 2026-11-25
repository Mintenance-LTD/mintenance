import { beforeEach, expect, it, vi } from 'vitest';
import { readPropertyRepair } from '@/lib/services/property-team/read-property-repair';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  canPerform: vi.fn(),
  from: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: {
    authorize: mocks.authorize,
    canPerform: mocks.canPerform,
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/job-storage', () => ({
  extractJobStoragePath: (path: string) => path,
  signJobStoragePath: mocks.sign,
}));

const property = '12345678-0000-4000-8000-000000000001';
const job = '12345678-0000-4000-8000-000000000002';
const document = `job-photos/${job}/after/verified.jpg`;

function rows(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ authorized: true, role: 'viewer' });
  mocks.canPerform.mockReturnValue(false);
  mocks.sign.mockResolvedValue('https://test.example.invalid/signed.jpg');
});

it('stops before reading a repair when property access is unavailable', async () => {
  mocks.authorize.mockResolvedValue({ authorized: false, role: null });
  expect(await readPropertyRepair('outsider', property, job)).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
});

it('requires the exact job, property and owner and excludes drafts', async () => {
  const propertyTable = rows({ id: property, owner_id: 'owner' });
  const jobTable = rows(null);
  mocks.from.mockReturnValueOnce(propertyTable).mockReturnValueOnce(jobTable);

  expect(await readPropertyRepair('member', property, job)).toBeNull();
  expect(jobTable.eq.mock.calls).toEqual([
    ['id', job],
    ['property_id', property],
    ['homeowner_id', 'owner'],
  ]);
  expect(jobTable.neq).toHaveBeenCalledWith('status', 'draft');
  expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
    'properties',
    'jobs',
  ]);
});

it('returns scoped photos and next steps for a viewer without financial fields or controls', async () => {
  mocks.from
    .mockReturnValueOnce(
      rows({ id: property, owner_id: 'owner', property_name: 'Shared home' })
    )
    .mockReturnValueOnce(
      rows({ id: job, title: 'Fix tap', status: 'completed', budget: 200 })
    )
    .mockReturnValueOnce(
      rows([
        { id: 'bound', photo_type: 'after', storage_path: document },
        {
          id: 'unbound',
          photo_type: 'after',
          storage_path: 'job-photos/different-job/after/unrelated.jpg',
        },
      ])
    )
    .mockReturnValueOnce(
      rows({ waiting_for: 'approval', due_at: null, note: 'Private note' })
    );

  const repair = await readPropertyRepair('member', property, job);
  expect(repair).toMatchObject({
    id: job,
    canManageFollowup: false,
    nextAction: 'Waiting for approval',
    photos: [
      { id: 'bound', url: 'https://test.example.invalid/signed.jpg' },
      { id: 'unbound', url: null },
    ],
  });
  expect(repair).not.toHaveProperty('budget');
  expect(repair).not.toHaveProperty('note');
  expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(document, 600);
});
