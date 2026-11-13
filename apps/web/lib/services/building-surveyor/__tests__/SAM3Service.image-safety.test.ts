import { SAM3Service } from '../SAM3Service';
import { safeFetch } from '@/lib/security/safe-fetch';

vi.mock('@/lib/security/safe-fetch', () => ({ safeFetch: vi.fn() }));

describe('SAM3 image download boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('stops before contacting the model when image validation fails', async () => {
    vi.mocked(safeFetch).mockRejectedValue(
      new Error('Private destination rejected')
    );
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(
      await SAM3Service.segmentDamageTypes('http://127.0.0.1/private')
    ).toBeNull();
    expect(safeFetch).toHaveBeenCalledWith(
      'http://127.0.0.1/private',
      expect.objectContaining({
        maxBytes: 10 * 1024 * 1024,
        timeoutMs: 10_000,
        allowedContentTypes: ['image/'],
      })
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends only validated image bytes to the configured model service', async () => {
    vi.stubEnv('SAM3_SERVICE_URL', 'https://model.example.test');
    vi.mocked(safeFetch).mockResolvedValue({
      buffer: Buffer.from('synthetic-image'),
      contentType: 'image/png',
      size: 15,
    });
    const expected = { success: true, damage_types: {}, num_instances: 0 };
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => expected });
    vi.stubGlobal('fetch', fetcher);
    expect(
      await SAM3Service.segmentDamageTypes(
        'https://images.example.test/photo.png'
      )
    ).toEqual(expected);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://model.example.test/segment-damage-types'
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body).image_base64).toBe(
      Buffer.from('synthetic-image').toString('base64')
    );
  });
});
