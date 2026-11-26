import { expect, it } from 'vitest';
import {
  propertyRepairQueueHref,
  propertyRepairQueueReturn,
} from '@/lib/properties/repair-navigation';

it('preserves the queue scope, exact property, filters and page across a repair round trip', () => {
  const property = '00000000-0000-4000-8000-000000000001';
  const filters = new URLSearchParams({
    property,
    scope: 'mine',
    priority: '1',
    person: 'Test Person',
    sort: 'due',
    offset: '25',
    destination: 'https://example.com',
  });
  const repairUrl = new URL(
    propertyRepairQueueHref(property, 'repair', filters),
    'https://example.test'
  );
  expect(repairUrl.pathname).toBe(`/properties/${property}/repairs/repair`);
  expect(repairUrl.searchParams.get('from')).toBe('queue');
  const queueUrl = new URL(
    propertyRepairQueueReturn(repairUrl.searchParams),
    'https://example.test'
  );
  expect(queueUrl.pathname).toBe('/properties/work-queue');
  filters.delete('destination');
  expect(Object.fromEntries(queueUrl.searchParams.entries())).toEqual(
    Object.fromEntries(filters.entries())
  );
});

it('returns old or unfiltered repair links to the plain queue', () => {
  const params = new URLSearchParams({ from: 'queue', property: 'invalid' });
  expect(propertyRepairQueueReturn(params)).toBe('/properties/work-queue');
});
