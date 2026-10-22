import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  read: vi.fn(),
  requireReceipt: vi.fn(),
  sendAccessEmail: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: m.read }) }) }),
  },
}));
vi.mock('@/lib/reports/followup', () => ({
  requireReceipt: m.requireReceipt,
  sendAccessEmail: m.sendAccessEmail,
  hashSecret: (v: string) => `hash:${v}`,
}));
import { POST } from '@/app/api/report-access/route';
const reportId = '00000000-0000-4000-8000-000000000001';
const call = (body: object) =>
  POST(
    new NextRequest('https://example.test/api/report-access', {
      method: 'POST',
      body: JSON.stringify({ reportId, ...body }),
    }),
    {} as never
  );
beforeEach(() => vi.resetAllMocks());
it('denies email enrolment without a valid receipt before looking up an address', async () => {
  m.requireReceipt.mockRejectedValue(new Error('Forbidden'));
  await expect(call({ action: 'request' })).rejects.toThrow('Forbidden');
  expect(m.read).not.toHaveBeenCalled();
  expect(m.sendAccessEmail).not.toHaveBeenCalled();
});
it('returns the same recovery response for unknown and wrong-address reports', async () => {
  m.read
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: { email: 'owner@example.test' } });
  const unknown = await call({
    action: 'recover',
    email: 'other@example.test',
  });
  const wrong = await call({ action: 'recover', email: 'other@example.test' });
  expect(await unknown.json()).toEqual(await wrong.json());
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.sendAccessEmail).not.toHaveBeenCalled();
});
it('rejects expired or reused verification links without returning a receipt', async () => {
  m.rpc.mockResolvedValue({ data: false });
  const result = await call({ action: 'verify', token: 'a'.repeat(64) });
  expect(result.status).toBe(410);
  expect(await result.json()).not.toHaveProperty('conversation_url');
});
it('uses atomic issuance and never changes the receipt during a recovery request', async () => {
  m.read.mockResolvedValue({
    data: { email: 'owner@example.test', requested_at: '2000-01-01' },
  });
  m.rpc.mockResolvedValue({ data: true });
  m.sendAccessEmail.mockResolvedValue(true);
  const result = await call({ action: 'recover', email: 'owner@example.test' });
  expect(result.status).toBe(200);
  expect(m.rpc).toHaveBeenCalledOnce();
  expect(m.rpc.mock.calls[0][0]).toBe('issue_report_email');
  expect(m.sendAccessEmail).toHaveBeenCalledOnce();
});
