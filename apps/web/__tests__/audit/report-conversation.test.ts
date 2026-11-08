// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  summary: vi.fn(),
  count: { count: 51, error: null as null | Error },
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: mock }));
vi.mock('@/lib/reports/followup', () => ({ reportPhotos: async () => [] }));
import { conversation } from '@/lib/reports/conversation';
const id = '00000000-0000-4000-8000-000000008005';
beforeEach(() => {
  vi.clearAllMocks();
  mock.rpc.mockResolvedValue({
    data: { messages: [], hasMore: true },
    error: null,
  });
  mock.count = { count: 51, error: null };
  mock.summary.mockResolvedValue({
    data: {
      category: 'plumbing',
      description: 'Tap leaking',
      created_at: '2026-11-01T10:00:00Z',
    },
    error: null,
  });
  mock.from.mockImplementation((table: string) => ({
    select: (...fields: unknown[]) => {
      mock.select(table, ...fields);
      return {
        eq: () =>
          table === 'report_messages'
            ? Promise.resolve(mock.count)
            : { maybeSingle: mock.summary },
      };
    },
  }));
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
  expect(mock.from).not.toHaveBeenCalled();
});
it('authorizes before counting and reauthorizes the last page', async () => {
  const result = await conversation(
    new NextRequest(
      `http://localhost/api/report-conversation?reportId=${id}&latest=true`
    ),
    'verified'
  );
  expect(mock.rpc).toHaveBeenCalledTimes(2);
  expect(mock.rpc).toHaveBeenLastCalledWith(
    'report_conversation',
    expect.objectContaining({
      p_offset: 50,
      p_actor: 'verified',
      p_message: null,
    })
  );
  expect(await result.json()).toMatchObject({
    pageOffset: 50,
    summary: { description: 'Tap leaking' },
  });
  expect(mock.select).toHaveBeenCalledWith(
    'anonymous_reports',
    'category,description,created_at'
  );
  expect(mock.rpc.mock.invocationCallOrder[0]).toBeLessThan(
    mock.from.mock.invocationCallOrder[0]
  );
});
it('denies revoked access on the second read without fetching the summary', async () => {
  mock.rpc
    .mockResolvedValueOnce({
      data: { messages: [], hasMore: true },
      error: null,
    })
    .mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  await expect(
    conversation(
      new NextRequest(
        `http://localhost/api/report-conversation?reportId=${id}&latest=true`
      ),
      'verified'
    )
  ).rejects.toThrow('Report unavailable');
  expect(mock.summary).not.toHaveBeenCalled();
});
it('never treats a failed latest count as empty history', async () => {
  mock.count.error = new Error('offline');
  await expect(
    conversation(
      new NextRequest(
        `http://localhost/api/report-conversation?reportId=${id}&latest=true`
      ),
      'verified'
    )
  ).rejects.toThrow('offline');
});
it('retains history with an explicit summary failure', async () => {
  mock.summary.mockResolvedValue({ data: null, error: new Error('offline') });
  const result = await conversation(
    new NextRequest(`http://localhost/api/report-conversation?reportId=${id}`),
    'verified'
  );
  expect(await result.json()).toMatchObject({
    summary: null,
    summary_unavailable: true,
    messages: [],
  });
});
it('acknowledges the exact committed message without a summary read', async () => {
  const result = await conversation(
    new NextRequest('http://localhost/api/report-conversation', {
      method: 'POST',
      body: JSON.stringify({ reportId: id, messageId: id, body: 'Update' }),
    }),
    'verified'
  );
  expect(await result.json()).toMatchObject({ messageId: id });
  expect(mock.from).not.toHaveBeenCalled();
});
it('avoids an extra count and RPC when the current page is already latest', async () => {
  mock.rpc.mockResolvedValue({
    data: { messages: [], hasMore: false },
    error: null,
  });
  const result = await conversation(
    new NextRequest(
      `http://localhost/api/report-conversation?reportId=${id}&latest=true`
    ),
    'verified'
  );
  expect(await result.json()).toMatchObject({ pageOffset: 0, hasMore: false });
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(mock.from).not.toHaveBeenCalledWith('report_messages');
});
