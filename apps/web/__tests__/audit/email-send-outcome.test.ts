// @vitest-environment node
const config = vi.hoisted(() => ({
  BREVO_API_KEY: '',
  SENDGRID_API_KEY: '',
  RESEND_API_KEY: '',
  EMAIL_FROM: 'noreply@example.test',
  EMAIL_FROM_NAME: 'Mintenance',
}));
vi.mock('@/lib/env', () => ({ env: config }));
vi.mock('@mintenance/shared', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
const send = vi.fn();
const options = {
  to: 'recipient@example.test',
  subject: 'Test',
  html: '<p>Test</p>',
  text: 'Test',
  timeoutMs: 8000,
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  Object.assign(config, {
    BREVO_API_KEY: '',
    SENDGRID_API_KEY: '',
    RESEND_API_KEY: '',
  });
  vi.stubGlobal('fetch', send);
});
afterEach(() => vi.unstubAllGlobals());
it('reports missing configuration as safely retryable without network', async () => {
  const { EmailService } = await import('@/lib/email-service');
  expect(await EmailService.sendEmailWithOutcome(options)).toBe('retryable');
  expect(await EmailService.sendEmail(options)).toBe(false);
  expect(send).not.toHaveBeenCalled();
});
it.each([
  ['BREVO_API_KEY', 'https://api.brevo.com/v3/smtp/email'],
  ['SENDGRID_API_KEY', 'https://api.sendgrid.com/v3/mail/send'],
  ['RESEND_API_KEY', 'https://api.resend.com/emails'],
] as const)(
  'preserves %s provider payload and boolean callers',
  async (key, url) => {
    config[key] = 'synthetic-test-key';
    send.mockResolvedValue({ ok: true, status: 202 });
    const { EmailService } = await import('@/lib/email-service');
    expect(await EmailService.sendEmailWithOutcome(options)).toBe('sent');
    expect(await EmailService.sendEmail(options)).toBe(true);
    expect(send).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      })
    );
    const payload = JSON.parse(send.mock.calls[0][1].body);
    expect(JSON.stringify(payload)).toContain(options.to);
    expect(JSON.stringify(payload)).toContain(options.html);
  }
);
it.each([
  [429, 'retryable'],
  [400, 'failed'],
  [401, 'failed'],
  [422, 'failed'],
  [500, 'unknown'],
  [503, 'unknown'],
] as const)('classifies HTTP %i as %s', async (status, expected) => {
  config.BREVO_API_KEY = 'synthetic-test-key';
  send.mockResolvedValue({ ok: false, status });
  const { EmailService } = await import('@/lib/email-service');
  expect(await EmailService.sendEmailWithOutcome(options)).toBe(expected);
  expect(await EmailService.sendEmail(options)).toBe(false);
});
it('does not treat an ambiguous network timeout as safe to retry', async () => {
  config.BREVO_API_KEY = 'synthetic-test-key';
  send.mockRejectedValue(new Error('timeout'));
  const { EmailService } = await import('@/lib/email-service');
  expect(await EmailService.sendEmailWithOutcome(options)).toBe('unknown');
});
