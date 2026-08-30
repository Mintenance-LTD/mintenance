import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  sendWelcome: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_config: unknown, handler: (request: NextRequest) => Promise<Response>) =>
    (request: NextRequest) =>
      handler(request),
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: { sendNewsletterWelcomeEmail: mocks.sendWelcome },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { POST } from '../route';

const TOKEN = '12345678-1234-4234-8234-123456789012';

function request(email = 'Person@Example.com') {
  return new NextRequest('https://example.test/api/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' },
  });
}

function existingLookup(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  };
}

function insertResult(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.sendWelcome.mockReset();
    mocks.sendWelcome.mockResolvedValue(true);
  });

  it('passes the persisted unsubscribe token to the welcome email', async () => {
    mocks.from
      .mockReturnValueOnce(existingLookup({ data: null, error: null }))
      .mockReturnValueOnce(
        insertResult({
          data: { id: 'subscription-1', unsubscribe_token: TOKEN },
          error: null,
        })
      );

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(mocks.sendWelcome).toHaveBeenCalledWith('person@example.com', TOKEN);
  });

  it('returns 503 instead of claiming success when persistence fails', async () => {
    mocks.from
      .mockReturnValueOnce(existingLookup({ data: null, error: null }))
      .mockReturnValueOnce(
        insertResult({
          data: null,
          error: { code: 'XX000', message: 'database unavailable' },
        })
      );

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to subscribe right now. Please try again later.',
    });
    expect(mocks.sendWelcome).not.toHaveBeenCalled();
  });
});
