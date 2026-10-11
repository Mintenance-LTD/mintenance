import { expect, it } from 'vitest';
import { isPublicRoute } from '@/middleware/public-routes';

it.each(['/for-homeowners', '/for-contractors', '/resources', '/verification', '/blog/compare-bids'])('makes the public information page %s accessible', (path) => {
  expect(isPublicRoute(path)).toBe(true);
});

it.each(['/contractor/settings', '/contractor/dashboard-enhanced', '/admin/disputes', '/api/contractor/appointments'])('keeps private route %s protected', (path) => {
  expect(isPublicRoute(path)).toBe(false);
});

const publicId = '236c6e76-4c29-4569-acb6-54d65b67f83e';
it.each(['', '/reviews', '/metrics'])('allows only public profile endpoint %s', suffix => {
  expect(isPublicRoute(`/api/contractors/${publicId}${suffix}`)).toBe(true);
});
it.each(['settings', 'documents', `${publicId}/documents`, `${publicId}/settings`, `${publicId}/reviews/private`, `${publicId}/metrics/private`, `${publicId}/jobs`])('protects contractor API %s', path => {
  expect(isPublicRoute(`/api/contractors/${path}`)).toBe(false);
});
