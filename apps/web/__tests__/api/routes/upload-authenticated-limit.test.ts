// @vitest-environment node
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  role: 'homeowner',
  limit: vi.fn(),
  validate: vi.fn(),
  storage: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (
        request: NextRequest,
        context: { user: { id: string; role: string } }
      ) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, {
        user: { id: 'verified-user', role: mocks.role },
      }),
}));
vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: mocks.limit,
  createRateLimitHeaders: () => ({ 'Retry-After': '60' }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { storage: { from: mocks.storage } },
}));
vi.mock('@/lib/security/file-validator', () => ({
  validateImageUpload: mocks.validate,
  createValidationErrorResponse: () => ({ error: 'Invalid image' }),
  generateSecureFilename: () => 'image.png',
}));
import { POST } from '@/app/api/upload/route';

function request() {
  const form = new FormData();
  form.set(
    'file',
    new Blob(['invalid image'], { type: 'image/png' }),
    'image.png'
  );
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: form,
    headers: {
      authorization: 'Bearer test-token',
      'x-user-id': 'forged-user',
      'x-user-role': 'admin',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'homeowner';
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.validate.mockResolvedValue({ valid: false, errors: ['Invalid image'] });
});

it.each(['homeowner', 'contractor', 'admin'])(
  'uses the verified %s identity for upload limits',
  async (role) => {
    mocks.role = role;
    const response = await POST(request(), { params: Promise.resolve({}) });
    expect(response.status).toBe(400); // Reaches content validation, not anonymous rate denial.
    expect(mocks.limit).toHaveBeenCalledWith(expect.anything(), {
      path: '/api/upload',
      identifier: 'user:verified-user',
      tier: role === 'admin' ? 'admin' : 'authenticated',
    });
    expect(mocks.validate).toHaveBeenCalledOnce();
    expect(mocks.storage).not.toHaveBeenCalled();
  }
);

it('still rejects an exhausted authenticated allowance before touching uploaded content', async () => {
  mocks.limit.mockResolvedValue({ allowed: false });
  const response = await POST(request(), { params: Promise.resolve({}) });
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('60');
  expect(mocks.validate).not.toHaveBeenCalled();
  expect(mocks.storage).not.toHaveBeenCalled();
});
