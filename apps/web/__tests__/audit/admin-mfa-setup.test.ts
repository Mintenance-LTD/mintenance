// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ validate: vi.fn(), profile: vi.fn(), limit: vi.fn(), enroll: vi.fn(), verify: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, fn: unknown) => fn }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: () => ({ select: () => ({ eq: () => ({ single: m.profile }) }) }) } }));
vi.mock('@/lib/mfa/mfa-service', () => ({ MFAService: { validatePreMFASession: m.validate, enrollTOTP: m.enroll, verifyTOTPEnrollment: m.verify, deletePreMFASession: m.remove } }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: m.limit } }));
vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn(), getClientIp: () => '127.0.0.1' }));
import { POST } from '../../app/api/auth/mfa/setup/route';
const call = (extra = {}) => POST(new Request('https://example.com/api/auth/mfa/setup', { method: 'POST', body: JSON.stringify({ action: 'enroll', preMfaToken: 'test-token-123456789', ...extra }) }) as never);
beforeEach(() => {
  vi.clearAllMocks();
  m.validate.mockResolvedValue('admin-id');
  m.profile.mockResolvedValue({ data: { role: 'admin', mfa_enabled: false }, error: null });
  m.limit.mockResolvedValue({ allowed: true });
  m.enroll.mockResolvedValue({ secret: 'synthetic', qrCodeDataUrl: 'data:image/png;base64,test', backupCodes: ['test'] });
  m.verify.mockResolvedValue({ success: true });
});
it('rejects missing or expired password proof', async () => {
  m.validate.mockResolvedValue(null);
  expect((await call()).status).toBe(401);
  expect(m.enroll).not.toHaveBeenCalled();
});
it.each([{ role: 'contractor', mfa_enabled: false }, { role: 'admin', mfa_enabled: true }])('rejects unauthorized enrollment: %j', async profile => {
  m.profile.mockResolvedValue({ data: profile });
  expect((await call()).status).toBe(403);
  expect(m.enroll).not.toHaveBeenCalled();
});
it('enrolls without creating an authenticated cookie and forbids caching', async () => {
  const response = await call();
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(m.enroll).toHaveBeenCalledWith('admin-id');
});
it('rejects bad codes without consuming the setup token', async () => {
  m.verify.mockResolvedValue({ success: false });
  expect((await call({ action: 'verify', code: '123456' })).status).toBe(400);
  expect(m.remove).not.toHaveBeenCalled();
});
it('consumes the setup token after verification, without issuing admin cookies', async () => {
  const response = await call({ action: 'verify', code: '123456' });
  expect(response.status).toBe(200);
  expect(m.remove).toHaveBeenCalledWith('test-token-123456789');
  expect(response.headers.get('set-cookie')).toBeNull();
});
it('rate limits enrollment per account', async () => {
  m.limit.mockResolvedValue({ allowed: false });
  expect((await call()).status).toBe(429);
  expect(m.enroll).not.toHaveBeenCalled();
});
