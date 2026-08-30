import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
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

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { GET } from '../route';

const TOKEN = '12345678-1234-4234-8234-123456789012';

function selectChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

describe('GET /api/email/unsubscribe', () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it('rejects malformed tokens before querying the database', async () => {
    const response = await GET(
      new NextRequest('https://example.test/api/email/unsubscribe?token=bad'),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('deactivates a newsletter subscription when its token matches', async () => {
    const preferences = selectChain({ data: null, error: null });
    const newsletter = selectChain({
      data: { id: 'subscription-1' },
      error: null,
    });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const newsletterUpdate = {
      update: vi.fn().mockReturnValue({ eq: updateEq }),
    };

    mocks.from
      .mockReturnValueOnce(preferences)
      .mockReturnValueOnce(newsletter)
      .mockReturnValueOnce(newsletterUpdate);

    const response = await GET(
      new NextRequest(
        `https://example.test/api/email/unsubscribe?token=${TOKEN}`
      ),
      { params: Promise.resolve({}) }
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(body).toContain('Mintenance newsletter emails');
    expect(newsletterUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'subscription-1');
  });

  it('returns a generic 404 when neither token store matches', async () => {
    mocks.from
      .mockReturnValueOnce(selectChain({ data: null, error: null }))
      .mockReturnValueOnce(selectChain({ data: null, error: null }));

    const response = await GET(
      new NextRequest(
        `https://example.test/api/email/unsubscribe?token=${TOKEN}`
      ),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid or expired unsubscribe link',
    });
  });
});
