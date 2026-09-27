// @vitest-environment node
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import type { ConfigManager } from '@mintenance/auth';
vi.mock('@/lib/auth/token-blacklist', () => ({ tokenBlacklist: {} }));
vi.mock('@/lib/security-monitor', () => ({ securityMonitor: {} }));
import { verifyJwtToken } from '../../middleware/auth';

const secret = 'synthetic-shared-signing-key-for-mobile-regression-only';
const config = { getRequired: () => secret } as unknown as ConfigManager;
const request = new NextRequest('https://example.invalid/api/jobs');
async function signed(role: string, timestamps = false) {
  return new SignJWT({
    role,
    session_id: 'synthetic-session',
    ...(timestamps
      ? { sessionStart: Date.now(), lastActivity: Date.now() }
      : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('synthetic-user')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

it('does not classify a valid provider token as an application session when signing keys coincide', async () => {
  expect(
    await verifyJwtToken(
      await signed('authenticated'),
      config,
      request,
      '/api/jobs'
    )
  ).toBeNull();
});

it('still routes provider tokens to provider verification when they contain timeout-like claims', async () => {
  expect(
    await verifyJwtToken(
      await signed('authenticated', true),
      config,
      request,
      '/api/jobs'
    )
  ).toBeNull();
});

it.each(['homeowner', 'contractor', 'admin'])(
  'preserves signed %s application sessions and timeout claims',
  async (role) => {
    expect(
      await verifyJwtToken(
        await signed(role, true),
        config,
        request,
        '/api/jobs'
      )
    ).toMatchObject({
      role,
      sessionStart: expect.any(Number),
      lastActivity: expect.any(Number),
    });
  }
);

it('does not manufacture timeout claims for legacy application sessions', async () => {
  const payload = await verifyJwtToken(
    await signed('homeowner'),
    config,
    request,
    '/api/jobs'
  );
  expect(payload?.sessionStart).toBeUndefined();
  expect(payload?.lastActivity).toBeUndefined();
});
