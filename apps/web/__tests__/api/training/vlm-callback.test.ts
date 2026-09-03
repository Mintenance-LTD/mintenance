// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly

import crypto from 'crypto';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  checkRateLimit: vi.fn(),
  markJobCompleted: vi.fn(),
  releaseReservation: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.checkRateLimit },
}));

vi.mock(
  '@/lib/services/building-surveyor/distillation/ExperienceBufferService',
  () => ({
    ExperienceBufferService: {
      markJobCompleted: mocks.markJobCompleted,
      releaseReservation: mocks.releaseReservation,
    },
  })
);

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_config: unknown, handler: (request: NextRequest) => unknown) =>
    async (request: NextRequest) =>
      handler(request),
}));

import { POST } from '@/app/api/training/vlm-callback/route';

const JOB_ID = 'kd-test-vlm-job';
const SECRET = 'callback-test-secret';

function makeRequest(payload: Record<string, unknown>): NextRequest {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('hex');
  return new NextRequest('https://example.com/api/training/vlm-callback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-mint-signature': signature,
    },
    body,
  });
}

describe('VLM training callback durability', () => {
  const originalSecret = process.env.MINTENANCE_CALLBACK_SECRET;

  beforeEach(() => {
    process.env.MINTENANCE_CALLBACK_SECRET = SECRET;
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.markJobCompleted.mockResolvedValue(undefined);
    mocks.releaseReservation.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (originalSecret === undefined) {
      delete process.env.MINTENANCE_CALLBACK_SECRET;
    } else {
      process.env.MINTENANCE_CALLBACK_SECRET = originalSecret;
    }
  });

  it('returns 503 when completion cannot be persisted so the worker can retry', async () => {
    const eq = vi.fn().mockResolvedValue({
      error: { message: 'database unavailable' },
    });
    mocks.from.mockReturnValue({
      update: vi.fn(() => ({ eq })),
    });

    const response = await POST(
      makeRequest({
        jobId: JOB_ID,
        success: true,
        adapterStoragePath: 'vlm-adapters/test',
        metrics: {},
        errorMessage: null,
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Failed to persist training completion',
    });
    expect(mocks.markJobCompleted).not.toHaveBeenCalled();
  });

  it('acknowledges a durable completion even if bookkeeping fails', async () => {
    mocks.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });
    mocks.markJobCompleted.mockRejectedValue(new Error('buffer unavailable'));

    const response = await POST(
      makeRequest({
        jobId: JOB_ID,
        success: true,
        adapterStoragePath: 'vlm-adapters/test',
        metrics: { loss: 0.1 },
        errorMessage: null,
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, jobId: JOB_ID });
  });
});
