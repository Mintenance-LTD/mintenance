import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLocalSupabaseAvailable } from '../test/integration/supabase-test-client';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe('local integration database readiness', () => {
  it('checks a bounded table query instead of generating OpenAPI', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    expect(await isLocalSupabaseAvailable()).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/rest/v1/profiles');
    expect(new URL(url).search).toBe('?select=id&limit=0');
    expect(options.signal).toBeDefined();
    expect(options.headers.apikey).toBeTruthy();
  });

  it('does not mistake an unauthorized or failing API for a ready database', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );
    expect(await isLocalSupabaseAvailable()).toBe(false);
  });

  it('reports unavailable when the request fails or times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('request aborted'))
    );
    expect(await isLocalSupabaseAvailable()).toBe(false);
  });
});
