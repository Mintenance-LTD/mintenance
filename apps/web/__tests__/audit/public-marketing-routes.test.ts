import { expect, it } from 'vitest';
import { isPublicRoute } from '@/middleware/public-routes';

it.each(['/for-homeowners', '/for-contractors', '/resources', '/verification', '/blog/compare-bids'])('makes the public information page %s accessible', (path) => {
  expect(isPublicRoute(path)).toBe(true);
});

it.each(['/contractor/settings', '/contractor/dashboard-enhanced', '/admin/disputes', '/api/contractor/appointments'])('keeps private route %s protected', (path) => {
  expect(isPublicRoute(path)).toBe(false);
});
