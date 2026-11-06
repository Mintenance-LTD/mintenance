// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  email: vi.fn(),
  is: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/env', () => ({ getAppUrl: () => 'https://example.test' }));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendQuoteNotification: mocks.email },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      let updating = false;
      const query = {
        select: () => query,
        single: mocks.read,
        maybeSingle: () => (updating ? mocks.save() : mocks.read()),
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return query;
        },
        is: (...args: unknown[]) => {
          mocks.is(...args);
          return query;
        },
        update: (...args: unknown[]) => {
          updating = true;
          mocks.update(...args);
          return query;
        },
      };
      return query;
    },
  },
}));
import { POST } from '@/app/api/contractor/send-quote/route';
const quoteId = '11111111-1111-4111-8111-111111111111';
const version = '2026-11-06T12:00:00.123456+00:00';
const quote = {
  id: quoteId,
  status: 'draft',
  client_email: 'synthetic@example.test',
  client_name: 'Test',
  total_amount: '46.50',
  updated_at: version,
};
const call = (expected_updated_at?: string) =>
  (
    POST as unknown as (
      req: NextRequest,
      context: { user: { id: string } }
    ) => Promise<Response>
  )(
    new NextRequest('http://localhost/api/contractor/send-quote', {
      method: 'POST',
      body: JSON.stringify({ quoteId, expected_updated_at }),
    }),
    { user: { id: 'actor' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ data: quote, error: null });
  mocks.save.mockResolvedValue({
    data: { ...quote, status: 'sent' },
    error: null,
  });
  mocks.email.mockResolvedValue(undefined);
});
it('sends the reviewed price only after a versioned draft transition', async () => {
  const response = await call(version);
  expect(response.status).toBe(200);
  expect((await response.json()).quote.status).toBe('sent');
  expect(mocks.eq.mock.calls.slice(-4)).toEqual([
    ['id', quoteId],
    ['contractor_id', 'actor'],
    ['status', 'draft'],
    ['updated_at', version],
  ]);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'sent', updated_at: expect.any(String) })
  );
  expect(mocks.email).toHaveBeenCalledWith(
    'synthetic@example.test',
    expect.objectContaining({ totalAmount: 46.5 })
  );
});
it('preserves sub-millisecond precision in the client version predicate', async () => {
  const stale = '2026-11-06T12:00:00.123455+00:00';
  mocks.save.mockResolvedValue({ data: null, error: null });
  await expect(call(stale)).rejects.toMatchObject({ statusCode: 409 });
  expect(mocks.eq).toHaveBeenCalledWith('updated_at', stale);
  expect(mocks.email).not.toHaveBeenCalled();
});
it('also guards older callers using the version read by the server', async () => {
  mocks.save.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
  expect(mocks.eq).toHaveBeenCalledWith('updated_at', version);
  expect(mocks.email).not.toHaveBeenCalled();
});
it('handles a legacy null version without bypassing the draft predicate', async () => {
  mocks.read.mockResolvedValue({
    data: { ...quote, updated_at: null },
    error: null,
  });
  await call();
  expect(mocks.is).toHaveBeenCalledWith('updated_at', null);
  expect(mocks.eq).toHaveBeenCalledWith('status', 'draft');
});
it.each(['accepted', 'sent', 'viewed', 'rejected', 'expired'])(
  'does not send or overwrite a %s quote',
  async (status) => {
    mocks.read.mockResolvedValue({ data: { ...quote, status }, error: null });
    await expect(call()).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  }
);
it('does not email when persistence fails', async () => {
  mocks.save.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  expect(mocks.email).not.toHaveBeenCalled();
});
it('does not mutate or email an unowned quote', async () => {
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.email).not.toHaveBeenCalled();
});
it('reports a read failure as unavailable without mutation or email', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.email).not.toHaveBeenCalled();
});
