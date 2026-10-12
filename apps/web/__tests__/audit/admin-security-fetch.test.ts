import { expect, it, vi } from 'vitest';
import { fetchSecurityDashboard } from '../../app/admin/security/_securityApi';
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: vi.fn() }));
it('uses the MFA-aware request supplied by the admin screen', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ metrics: { totalEvents: 1 } }) });
  expect(await fetchSecurityDashboard(request)).toEqual({ metrics: { totalEvents: 1 } });
  expect(request).toHaveBeenCalledWith('/api/admin/security-dashboard');
});
it('explains an expired session without displaying raw API JSON', async () => {
  const request = vi.fn().mockResolvedValue({ ok: false, status: 401 });
  await expect(fetchSecurityDashboard(request)).rejects.toThrow('Your session has expired. Sign in again');
});
