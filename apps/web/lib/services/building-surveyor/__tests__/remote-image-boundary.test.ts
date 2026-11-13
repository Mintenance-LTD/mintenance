import { safeFetch } from '@/lib/security/safe-fetch';

describe('actual remote image safety boundary', () => {
  it.each([
    'http://127.0.0.1/private',
    'http://169.254.169.254/latest/meta-data',
    'https://untrusted.example.test/photo.png',
    'file:///etc/passwd',
  ])('rejects %s before making a network request', async (url) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(safeFetch(url)).rejects.toThrow();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
