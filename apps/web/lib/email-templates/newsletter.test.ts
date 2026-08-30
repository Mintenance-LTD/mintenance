import { newsletterWelcomeTemplate } from './newsletter';

describe('newsletterWelcomeTemplate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses an opaque unsubscribe token in both HTML and text links', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test');
    const token = '12345678-1234-4234-8234-123456789012';

    const result = newsletterWelcomeTemplate(token);

    expect(result.html).toContain(
      `https://example.test/api/email/unsubscribe?token=${token}`
    );
    expect(result.text).toContain(
      `https://example.test/api/email/unsubscribe?token=${token}`
    );
    expect(result.html).not.toContain('?email=');
    expect(result.text).not.toContain('?email=');
  });

  it('URL-encodes the token value', () => {
    const result = newsletterWelcomeTemplate('token with spaces');

    expect(result.html).toContain('token%20with%20spaces');
    expect(result.text).toContain('token%20with%20spaces');
  });
});
