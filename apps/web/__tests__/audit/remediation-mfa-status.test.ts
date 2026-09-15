// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  gt: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ single: mocks.single, gt: mocks.gt }) }),
    }),
  },
}));
let service: typeof import('@/lib/mfa/service/mfa-status');
beforeAll(async () => {
  vi.stubGlobal('window', undefined);
  service = await import('@/lib/mfa/service/mfa-status');
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
  mocks.single.mockResolvedValue({
    data: { mfa_enabled: true, mfa_method: 'totp' },
    error: null,
  });
  mocks.gt.mockResolvedValue({ count: 1, error: null });
});
it('propagates database disable errors instead of claiming success', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'synthetic failure' } });
  await expect(service.disableMFA('synthetic-user')).rejects.toThrow(
    'Unable to disable MFA'
  );
  mocks.rpc.mockResolvedValue({ error: null });
  await expect(service.disableMFA('synthetic-user')).resolves.toBeUndefined();
});
it('does not report zero recovery counts after a failed read', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'synthetic failure' } });
  await expect(service.getMFAStatus('synthetic-user')).rejects.toThrow(
    'Unable to load MFA recovery status'
  );
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
  mocks.gt.mockResolvedValue({ error: { message: 'synthetic failure' } });
  await expect(service.getMFAStatus('synthetic-user')).rejects.toThrow(
    'Unable to load MFA recovery status'
  );
  mocks.gt.mockResolvedValue({ count: 1, error: null });
  await expect(service.getMFAStatus('synthetic-user')).resolves.toMatchObject({
    enabled: true,
    backupCodesCount: 2,
    trustedDevicesCount: 1,
  });
});
