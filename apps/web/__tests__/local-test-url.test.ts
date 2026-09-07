import { localTestUrl } from '../test/integration/local-test-url';

describe('local integration database URL', () => {
  it.each([
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'http://[::1]:54321',
    'https://localhost:54321',
  ])('allows the loopback origin %s', (value) => {
    expect(localTestUrl(`${value}/`)).toBe(value);
  });

  it.each([
    'https://project.supabase.co',
    'http://192.168.1.1:54321',
    'http://localhost.attacker.example',
    'http://localhost@attacker.example',
    'http://user:password@localhost:54321',
    'http://localhost:54321/proxy',
    'http://localhost:54321?upstream=remote',
    'http://localhost:54321#fragment',
    'ftp://localhost:54321',
    'not a URL',
  ])(
    'rejects unsafe test destination %s without echoing its value',
    (value) => {
      expect(() => localTestUrl(value)).toThrow(
        'SUPABASE_TEST_URL must be a loopback HTTP(S) origin'
      );
    }
  );
});
