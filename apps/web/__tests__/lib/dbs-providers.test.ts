// @vitest-environment node

import {
  initiateDBSOnlineCheck,
  initiateGBGroupCheck,
  initiateUCheckCheck,
} from '@/lib/services/verification/dbsProviders';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  process.env.DBS_ONLINE_API_KEY = 'test-dbs-key';
  process.env.GBGROUP_API_KEY = 'test-gb-key';
  process.env.UCHECK_API_KEY = 'test-ucheck-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DBS_ONLINE_API_KEY;
  delete process.env.GBGROUP_API_KEY;
  delete process.env.UCHECK_API_KEY;
});

const contractor = {
  first_name: 'Sam',
  last_name: 'Fixit',
  email: 'sam@example.com',
  date_of_birth: '1980-01-02',
  address: '1 High Street',
  city: 'Bath',
  postcode: 'BA1 1AA',
};

describe('DBS provider boundary', () => {
  it.each([
    ['DBS Online', initiateDBSOnlineCheck],
    ['GB Group', initiateGBGroupCheck],
    ['uCheck', initiateUCheckCheck],
  ])('returns a provider ID and applies a timeout (%s)', async (_name, initiate) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ check_id: 'provider-check-123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(initiate(contractor, 'basic')).resolves.toBe(
      'provider-check-123'
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects a provider response without a check ID', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'accepted' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(initiateDBSOnlineCheck(contractor, 'basic')).rejects.toThrow(
      'DBS Online returned no check ID'
    );
  });
});
