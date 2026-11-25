import { NextRequest } from 'next/server';
import { GET as deliveries } from '@/app/api/admin/support/deliveries/route';
import { POST as publish } from '@/app/api/admin/support/campaigns/[id]/route';

const id = '00000000-0000-4000-8000-000000000021';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  permissions: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'operator' }, params: { id } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc },
}));
vi.mock('@/lib/services/support/SupportService', () => ({
  requireSupportPermission: m.permissions,
}));
const context = { params: Promise.resolve({ id }) };

beforeEach(() => vi.resetAllMocks());

it('requires a deliberate all-customer confirmation before the publish RPC', async () => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: { audience: 'all' },
      error: null,
    })),
  };
  m.from.mockReturnValue(chain);
  m.rpc.mockResolvedValue({ data: 4, error: null });
  const submit = (body: object) =>
    publish(
      new NextRequest('https://example.test/campaigns/' + id, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      context
    );
  await expect(submit({})).rejects.toMatchObject({ statusCode: 400 });
  expect(m.rpc).not.toHaveBeenCalled();
  expect(await (await submit({ confirmAll: true })).json()).toMatchObject({
    queued: 4,
  });
  expect(m.rpc).toHaveBeenCalledWith('publish_customer_campaign', {
    p_campaign: id,
    p_actor: 'operator',
  });
});

it('searches by an exact case, job, dispute or recipient reference without returning message bodies', async () => {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    then: (resolve: (result: object) => unknown) =>
      resolve({
        data: [
          {
            id,
            case_reference: id,
            status: 'delivered',
            recipient_email: 'test@example.invalid',
          },
        ],
        error: null,
      }),
  };
  m.from.mockReturnValue(chain);
  const response = await deliveries(
    new NextRequest(
      'https://example.test/deliveries?status=delivered&search=' + id
    ),
    context
  );
  expect(chain.eq).toHaveBeenCalledWith('status', 'delivered');
  expect(chain.or).toHaveBeenCalledWith(
    expect.stringContaining('case_reference.eq.' + id)
  );
  expect(chain.select.mock.calls[0][0]).not.toContain('body');
  expect(await response.json()).toMatchObject({
    records: [{ id, case_reference: id, status: 'delivered' }],
  });
});
