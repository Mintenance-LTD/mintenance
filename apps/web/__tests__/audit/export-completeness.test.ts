import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  failedTable: '',
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async () => ({
    data: { email: 'synthetic@example.invalid' },
  }),
}));
import { POST } from '@/app/api/gdpr/export-data/route';
const call = () =>
  (
    POST as unknown as (
      request: NextRequest,
      context: unknown
    ) => Promise<Response>
  )(
    new NextRequest('http://localhost/api/gdpr/export-data', {
      method: 'POST',
      body: '{}',
    }),
    { user: { id: 'synthetic-user', email: 'synthetic@example.invalid' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.failedTable = '';
  mocks.rpc.mockResolvedValue({
    data: [{ table_name: 'profiles', data: { id: 'synthetic-user' } }],
    error: null,
  });
  mocks.from.mockImplementation((table: string) => {
    let inserted = false;
    const chain = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      gt: () => chain,
      eq: () => chain,
      in: () => chain,
      or: () => chain,
      insert: () => {
        inserted = true;
        return chain;
      },
      update: (value: unknown) => {
        mocks.update(value);
        return chain;
      },
      single: async () => ({
        data: inserted
          ? { id: 'synthetic-request' }
          : table === 'profiles'
            ? { id: 'synthetic-user' }
            : null,
        error: null,
      }),
      then: (resolve: (result: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: [],
            error:
              table === mocks.failedTable
                ? { message: 'Synthetic unavailable category' }
                : null,
          })
        ),
    };
    return chain;
  });
});
it('rejects and records an incomplete export instead of returning empty payment records as complete', async () => {
  mocks.failedTable = 'escrow_transactions';
  await expect(call()).rejects.toThrow('complete export is unavailable');
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'rejected' })
  );
  expect(mocks.update).not.toHaveBeenCalledWith(
    expect.objectContaining({ status: 'completed' })
  );
});
it('only marks completed after all categories are read successfully', async () => {
  const response = await call();
  expect(response.status).toBe(200);
  expect((await response.json()).data.data.users).toEqual([
    { id: 'synthetic-user' },
  ]);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'completed' })
  );
});
