import { expect, it } from 'vitest';
import { isPublicRoute } from '@/middleware/public-routes';
import { PRODUCT_DEMOS } from '@/components/marketing/demo-catalog';

it.each(PRODUCT_DEMOS)(
  'serves the reviewed $id demo without sign-in',
  (demo) => {
    expect(isPublicRoute(`/media/demos/${demo.file}.mp4`)).toBe(true);
    expect(isPublicRoute(`/media/demos/${demo.file}.vtt`)).toBe(true);
  }
);

it.each([
  '/media/demos/private.mp4',
  '/media/customer.mp4',
  '/api/jobs/private.mp4',
  '/media/demos/01-homeowner.mp4/private',
])('does not expose arbitrary media at %s', (path) => {
  expect(isPublicRoute(path)).toBe(false);
});

it.each([
  '/for-homeowners',
  '/for-contractors',
  '/resources',
  '/verification',
  '/blog/compare-bids',
])('makes the public information page %s accessible', (path) => {
  expect(isPublicRoute(path)).toBe(true);
});

it.each([
  '/contractor/settings',
  '/contractor/dashboard-enhanced',
  '/admin/disputes',
  '/api/contractor/appointments',
])('keeps private route %s protected', (path) => {
  expect(isPublicRoute(path)).toBe(false);
});

const publicId = '236c6e76-4c29-4569-acb6-54d65b67f83e';
it.each(['', '/reviews', '/metrics'])(
  'allows only public profile endpoint %s',
  (suffix) => {
    expect(isPublicRoute(`/api/contractors/${publicId}${suffix}`)).toBe(true);
  }
);
it.each([
  'settings',
  'documents',
  `${publicId}/documents`,
  `${publicId}/settings`,
  `${publicId}/reviews/private`,
  `${publicId}/metrics/private`,
  `${publicId}/jobs`,
])('protects contractor API %s', (path) => {
  expect(isPublicRoute(`/api/contractors/${path}`)).toBe(false);
});
