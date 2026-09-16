import { requireConfirmedDisputeAction } from '@/app/admin/disputes/components/dispute-action-response';
it.each([
  [202, { success: false, status: 'processing' }],
  [202, { success: true }],
  [200, {}],
  [200, { success: true }],
  [200, { success: true, status: 'failed' }],
  [200, { success: true, status: 'canceled' }],
  [200, { success: true, status: 'pending' }],
  [500, { error: { message: 'Recovery required' } }],
])('rejects unconfirmed settlement (%s)', async (status, body) => {
  await expect(
    requireConfirmedDisputeAction(
      new Response(JSON.stringify(body), { status: Number(status) })
    )
  ).rejects.toThrow();
});
it.each(['succeeded', 'completed'])(
  'accepts an explicit confirmed result (%s)',
  async (status) => {
    await expect(
      requireConfirmedDisputeAction(
        new Response(JSON.stringify({ success: true, status }))
      )
    ).resolves.toBeUndefined();
  }
);
