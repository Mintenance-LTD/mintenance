import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc } }));
import { MediationService } from '@/lib/services/disputes/MediationService';
import { mediationActionSchema } from '@/lib/disputes/mediation-contract';
const escrowId = 'fa220922-0000-4000-8000-000000000020';
const actorId = 'fa220922-0000-4000-8000-000000000001';
const state = {
  escrowId,
  status: 'pending',
  requestedAt: '2026-09-22T12:00:00Z',
  scheduledAt: null,
  completedAt: null,
};
beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: state, error: null });
});
it('passes the authenticated actor and exact payment to the atomic operation', async () => {
  expect(
    await MediationService.transition(escrowId, actorId, { action: 'request' })
  ).toEqual(state);
  expect(rpc).toHaveBeenCalledWith('transition_dispute_mediation', {
    p_escrow_id: escrowId,
    p_actor_id: actorId,
    p_action: 'request',
    p_scheduled_at: null,
    p_mediator_id: null,
    p_outcome: null,
  });
});
it.each([
  ['42501', 403],
  ['P0002', 404],
  ['23514', 409],
  ['08006', 500],
])('preserves database failure %s', async (code, statusCode) => {
  rpc.mockResolvedValue({ data: null, error: { code } });
  await expect(
    MediationService.transition(escrowId, actorId, { action: 'request' })
  ).rejects.toMatchObject({ statusCode });
});
it.each([
  null,
  {},
  [],
  { ...state, escrowId: actorId },
  { ...state, status: 'unknown' },
])('rejects incomplete or unrelated confirmations', async (data) => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(
    MediationService.transition(escrowId, actorId, { action: 'request' })
  ).rejects.toMatchObject({ statusCode: 500 });
});
it.each([
  { action: 'request', actorId },
  { action: 'schedule', scheduledAt: 'tomorrow', mediatorId: actorId },
  { action: 'complete', outcome: '   ' },
])('rejects malformed or injected actions', (action) => {
  expect(mediationActionSchema.safeParse(action).success).toBe(false);
});
