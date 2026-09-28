import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: (...args: unknown[]) => m.rpc(...args) },
}));
import { deliverTenantInvitation } from '@/lib/services/notifications/tenant-invitation-delivery';
beforeEach(() => {
  vi.clearAllMocks();
});
it('does not contact the provider if a concurrent or recent attempt owns the reservation', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  const send = vi.fn();
  expect(await deliverTenantInvitation('contact', 'property', send)).toEqual({
    sent: false,
    reserved: false,
  });
  expect(send).not.toHaveBeenCalled();
});
it('fails closed when the reservation database is unavailable', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: '08006' } });
  const send = vi.fn();
  await expect(
    deliverTenantInvitation('contact', 'property', send)
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it('records an interrupted provider outcome under the same attempt without immediate retry', async () => {
  m.rpc
    .mockResolvedValueOnce({ data: 'attempt', error: null })
    .mockResolvedValueOnce({ data: true, error: null });
  const send = vi.fn().mockRejectedValue(new Error('timeout'));
  expect(await deliverTenantInvitation('contact', 'property', send)).toEqual({
    sent: false,
    reserved: true,
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(m.rpc).toHaveBeenLastCalledWith('finish_property_invitation', {
    p_tenant_id: 'contact',
    p_attempt_id: 'attempt',
    p_sent: false,
  });
});
it('does not resend after provider success and tracking failure', async () => {
  m.rpc
    .mockResolvedValueOnce({ data: 'attempt', error: null })
    .mockResolvedValueOnce({ data: null, error: { code: '08006' } });
  const send = vi.fn().mockResolvedValue(true);
  expect(await deliverTenantInvitation('contact', 'property', send)).toEqual({
    sent: true,
    reserved: true,
  });
  expect(send).toHaveBeenCalledTimes(1);
});
