import { geocodeJobLocation } from '../geocode-job-location';

describe('legacy job geocoding', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends address text only to the fixed provider and rejects redirects', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'synthetic-geocoding-key');
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{ geometry: { location: { lat: 51.5, lng: 0 } } }],
        }),
      });
    vi.stubGlobal('fetch', fetcher);
    expect(
      await geocodeJobLocation('https://127.0.0.1/private?key=attacker')
    ).toEqual({ latitude: 51.5, longitude: 0 });
    const [input, options] = fetcher.mock.calls[0];
    const url = new URL(input);
    expect(url.origin).toBe('https://maps.googleapis.com');
    expect(url.searchParams.get('address')).toBe(
      'https://127.0.0.1/private?key=attacker'
    );
    expect(url.searchParams.get('key')).toBe('synthetic-geocoding-key');
    expect(options.redirect).toBe('error');
  });

  it('skips provider calls without a key or with an oversized address', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    expect(await geocodeJobLocation('London')).toBeNull();
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'synthetic-geocoding-key');
    expect(await geocodeJobLocation('x'.repeat(501))).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects malformed provider coordinates', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'synthetic-geocoding-key');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [{ geometry: { location: { lat: 91, lng: 0 } } }],
          }),
        })
    );
    expect(await geocodeJobLocation('London')).toBeNull();
  });
});
