import { expect, it } from 'vitest';
import { isPublicRoute } from '@/middleware/public-routes';
import { isAllowedRedirect } from '@/lib/utils/safe-redirect';
it('allows exactly the pre-session MFA page without exposing settings or adjacent paths', () => {
  expect(isPublicRoute('/auth/mfa-verify')).toBe(true);
  for (const path of [
    '/auth/mfa-verify-extra',
    '/auth/mfa-verify/private',
    '/settings/security/mfa',
    '/tenant/properties/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ])
    expect(isPublicRoute(path)).toBe(false);
});
it('preserves only valid same-origin tenant property return paths', () => {
  expect(
    isAllowedRedirect('/tenant/properties/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  ).toBe(true);
  expect(isAllowedRedirect('/tenant/properties/anything')).toBe(false);
  expect(
    isAllowedRedirect(
      'https://evil.invalid/tenant/properties/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )
  ).toBe(false);
});
