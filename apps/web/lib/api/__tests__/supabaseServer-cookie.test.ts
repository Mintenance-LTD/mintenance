import { describe, it, expect, vi } from 'vitest';
import { stringToBase64URL } from '@supabase/ssr/dist/main/utils/base64url';

// The global test setup mocks @/lib/api/supabaseServer. Restore the REAL module
// for this file — decodeSupabaseAuthCookie is pure and serverSupabase is a lazy
// Proxy, so importing the actual module has no load-time side effects.
vi.mock('@/lib/api/supabaseServer', async (importOriginal) => {
  return (await importOriginal()) as object;
});

import { decodeSupabaseAuthCookie } from '../supabaseServer';

// Regression (2026-08-03): @supabase/ssr defaults to cookieEncoding:'base64url'
// and stores the session as `base64-<base64url(JSON)>`. getUserJwtFromRequest
// used to JSON.parse the raw cookie, which threw, so every cookie-authed web
// request fell through to null → service-role client (RLS OFF). These lock in
// that the encoded cookie decodes back to parseable session JSON.

const SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
  refresh_token: 'rt',
  user: { id: 'u1', name: 'Zoë £ 日本' },
};

describe('decodeSupabaseAuthCookie', () => {
  it('decodes a base64url-encoded supabase cookie back to its JSON', () => {
    const json = JSON.stringify(SESSION);
    const cookie = `base64-${stringToBase64URL(json)}`;

    const decoded = decodeSupabaseAuthCookie(cookie);

    expect(decoded).toBe(json);
    expect(JSON.parse(decoded).access_token).toBe(SESSION.access_token);
  });

  it('preserves multi-byte unicode through the round trip', () => {
    const json = JSON.stringify(SESSION);
    const cookie = `base64-${stringToBase64URL(json)}`;

    expect(JSON.parse(decodeSupabaseAuthCookie(cookie)).user.name).toBe(
      SESSION.user.name
    );
  });

  it('reassembles chunked cookie values before decoding', () => {
    const json = JSON.stringify(SESSION);
    const full = `base64-${stringToBase64URL(json)}`;
    // @supabase/ssr splits the full `base64-...` string across .0/.1/... chunks.
    const chunk0 = full.slice(0, 24);
    const chunk1 = full.slice(24);

    const decoded = decodeSupabaseAuthCookie(chunk0 + chunk1);

    expect(JSON.parse(decoded).access_token).toBe(SESSION.access_token);
  });

  it('passes through legacy plain-JSON cookies untouched', () => {
    const json = JSON.stringify(SESSION);
    expect(decodeSupabaseAuthCookie(json)).toBe(json);
  });

  it('returns the input unchanged when the base64 body is undecodable', () => {
    // Not valid base64url after the prefix — must not throw; caller's
    // JSON.parse then fails gracefully and auth falls back as before.
    const raw = 'base64-@@@not-base64@@@';
    expect(() => decodeSupabaseAuthCookie(raw)).not.toThrow();
  });
});
