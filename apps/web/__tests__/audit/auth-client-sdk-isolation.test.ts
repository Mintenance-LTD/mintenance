// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.unmock('@/lib/api/supabaseServer');
vi.unmock('@supabase/supabase-js');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
it('preserves service authorization while real SDK user sessions finish in reverse order', async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.invalid');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
  const pending = new Map<string, (response: Response) => void>();
  const headers: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/v1/token') || url.includes('/auth/v1/verify')) {
        const body = JSON.parse(String(options?.body));
        const email = body.email ?? body.phone;
        return new Promise<Response>((resolve) => pending.set(email, resolve));
      }
      if (url.includes('/rest/v1/profiles')) {
        headers.push(new Headers(options?.headers).get('authorization') ?? '');
        return Promise.resolve(
          new Response('[]', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      throw new Error('Unexpected SDK request');
    })
  );
  const { createAnonClient, serverSupabase } =
    await import('@/lib/api/supabaseServer');
  const a = createAnonClient();
  const b = createAnonClient();
  const readService = async () => {
    const response = await serverSupabase.from('profiles').select('id');
    expect(response.error).toBeNull();
  };
  const loginA = a.auth.signInWithPassword({
    email: 'a@example.invalid',
    password: 'synthetic',
  });
  const loginB = b.auth.signInWithPassword({
    email: 'b@example.invalid',
    password: 'synthetic',
  });
  await vi.waitFor(() => expect(pending.size).toBe(2));
  const session = (id: string) => {
    const token = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url'
      ),
      Buffer.from(
        JSON.stringify({
          sub: id,
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url'),
      'synthetic-signature',
    ].join('.');
    return {
      token,
      response: new Response(
        JSON.stringify({
          access_token: token,
          refresh_token: 'synthetic-refresh-' + id,
          expires_in: 3600,
          token_type: 'bearer',
          user: { id, email: id + '@example.invalid', aud: 'authenticated' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      ),
    };
  };
  await readService();
  const second = session('bbbbbbbb-0000-4000-8000-000000000002');
  pending.get('b@example.invalid')!(second.response);
  expect((await loginB).error).toBeNull();
  await readService();
  const first = session('aaaaaaaa-0000-4000-8000-000000000001');
  pending.get('a@example.invalid')!(first.response);
  expect((await loginA).error).toBeNull();
  await readService();
  expect(headers).toEqual(Array(3).fill('Bearer synthetic-service-key'));
  await a.from('profiles').select('id');
  await b.from('profiles').select('id');
  expect(headers.slice(3)).toEqual([
    'Bearer ' + first.token,
    'Bearer ' + second.token,
  ]);
  const otp = createAnonClient();
  const verified = otp.auth.verifyOtp({
    phone: '+440000000000',
    token: '123456',
    type: 'sms',
  });
  await vi.waitFor(() => expect(pending.has('+440000000000')).toBe(true));
  const phoneSession = session('cccccccc-0000-4000-8000-000000000003');
  pending.get('+440000000000')!(phoneSession.response);
  expect((await verified).error).toBeNull();
  await readService();
  expect(headers.at(-1)).toBe('Bearer synthetic-service-key');
});
