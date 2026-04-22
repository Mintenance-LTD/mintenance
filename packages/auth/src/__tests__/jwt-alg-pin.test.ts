// Explicit vitest imports because packages/auth has no vitest config of
// its own and the root has no globals-enabled config either. Keeping the
// test self-contained so `npx vitest run` from any workspace finds it.
import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { generateJWT, verifyJWT } from '../jwt';

/**
 * Defense-in-depth: verifyJWT pins algorithms to ['HS256'].
 *
 * Goal of these tests:
 *   1. A legitimate HS256 token round-trips.
 *   2. A token signed with a different alg (RS256 / PS256 / HS512) or
 *      the infamous `alg: "none"` is REJECTED.
 *
 * The threat is algorithm-confusion: if a future verifier change accepts
 * any alg the library supports, an attacker with a leaked RSA public key
 * could sign tokens with HS256 against that public key and have them
 * accepted. Pinning `algorithms: ['HS256']` prevents this.
 */

const SECRET = 'test-secret-at-least-32-characters-long-for-jose';
const SECRET_BYTES = new TextEncoder().encode(SECRET);

async function signWith(
  alg: string,
  payload: Record<string, unknown>
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg } as { alg: string })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET_BYTES);
}

describe('verifyJWT — HS256 algorithm pin', () => {
  it('accepts a valid HS256 token minted by generateJWT', async () => {
    const token = await generateJWT(
      { id: 'user-1', email: 'a@b.co', role: 'homeowner' },
      SECRET
    );
    const payload = await verifyJWT(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-1');
    expect(payload?.email).toBe('a@b.co');
    expect(payload?.role).toBe('homeowner');
  });

  it('rejects HS512 tokens (algorithm confusion)', async () => {
    const token = await signWith('HS512', {
      sub: 'user-1',
      email: 'a@b.co',
      role: 'homeowner',
      type: 'access',
    });
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it('rejects HS384 tokens', async () => {
    const token = await signWith('HS384', {
      sub: 'user-1',
      email: 'a@b.co',
      role: 'homeowner',
      type: 'access',
    });
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it('rejects tokens with `alg: "none"`', async () => {
    // Manually craft a JWT with alg=none (jose.SignJWT refuses to sign
    // with alg=none, so we construct the header/body/sig ourselves).
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        sub: 'user-1',
        email: 'a@b.co',
        role: 'homeowner',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const token = `${header}.${body}.`;
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it('rejects a token signed with a wrong secret', async () => {
    const token = await generateJWT(
      { id: 'user-1', email: 'a@b.co', role: 'homeowner' },
      SECRET
    );
    const payload = await verifyJWT(
      token,
      'different-secret-at-least-32-characters-long'
    );
    expect(payload).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyJWT('not.a.jwt', SECRET)).toBeNull();
    expect(await verifyJWT('', SECRET)).toBeNull();
    expect(await verifyJWT('one.two', SECRET)).toBeNull();
  });
});
