import { DisputeResolutionAgent } from '@/lib/services/agents/DisputeResolutionAgent';
const mutation = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('Unexpected dispute mutation');
  })
);
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mutation, rpc: mutation },
}));
it('leaves dispute settlement to an authorized provider-backed resolution', async () => {
  expect(
    await DisputeResolutionAgent.attemptAutoResolution('synthetic-escrow')
  ).toBeNull();
  expect(mutation).not.toHaveBeenCalled();
});
