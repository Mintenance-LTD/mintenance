// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: mock }));
import { conversation } from '@/lib/reports/conversation';
const id = '00000000-0000-4000-8000-000000008005';
beforeEach(() => {
  vi.clearAllMocks();
  mock.rpc.mockResolvedValue({ data: { messages: [] }, error: null });
});
it('requires the private receipt before reading anonymous data', async () => {
  await expect(
    conversation(
      new NextRequest(
        `http://localhost/api/report-conversation/receipt?reportId=${id}`
      ),
      null
    )
  ).rejects.toThrow('Report unavailable');
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('hashes receipts and does not trust supplied actor IDs', async () => {
  await conversation(
    new NextRequest(
      `http://localhost/api/report-conversation/receipt?reportId=${id}&actor=other`,
      { headers: { 'x-report-receipt': 'a'.repeat(64) } }
    ),
    null
  );
  expect(mock.rpc).toHaveBeenCalledWith(
    'report_conversation',
    expect.objectContaining({
      p_actor: null,
      p_hash: createHash('sha256').update('a'.repeat(64)).digest('hex'),
    })
  );
});
it('uses the authenticated actor instead of a forged receipt', async () => {
  await conversation(
    new NextRequest(`http://localhost/api/report-conversation?reportId=${id}`, {
      headers: { 'x-report-receipt': 'a'.repeat(64) },
    }),
    'verified-actor'
  );
  expect(mock.rpc).toHaveBeenCalledWith(
    'report_conversation',
    expect.objectContaining({ p_actor: 'verified-actor', p_hash: null })
  );
});
it('requires a stable message ID for writes', async () => {
  await expect(
    conversation(
      new NextRequest('http://localhost/api/report-conversation', {
        method: 'POST',
        body: JSON.stringify({ reportId: id, body: 'Hello' }),
      }),
      'verified'
    )
  ).rejects.toThrow('Message required');
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('propagates failed persistence rather than reporting success', async () => {
  mock.rpc.mockResolvedValue({ data: null, error: new Error('offline') });
  await expect(
    conversation(
      new NextRequest(
        `http://localhost/api/report-conversation?reportId=${id}`
      ),
      'verified'
    )
  ).rejects.toThrow('offline');
});
