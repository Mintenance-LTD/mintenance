import { expect, it } from 'vitest';
import {
  recurringCategory,
  matchesRecurringTrade,
} from '@/lib/services/recurring/recurring-category';
import { propertyScheduleUpdate } from '@/lib/services/recurring/schedule-input';
it('maps legacy presets and normalizes typed categories', () => {
  expect(recurringCategory('general', 'Garden Maintenance')).toBe('gardening');
  expect(recurringCategory(' Plumbing ')).toBe('plumbing');
  expect(matchesRecurringTrade('gardening', 'Landscape gardening')).toBe(true);
  expect(matchesRecurringTrade('heating', 'Gas safety')).toBe(true);
  expect(matchesRecurringTrade('gardening', 'Plumbing')).toBe(false);
});
it('requires a contractor for preferred-only edits and explicit matching when clearing', () => {
  const base = {
    scheduleId: '11111111-1111-4111-8111-111111111111',
    expected_updated_at: '2026-10-12T10:00:00Z',
  };
  expect(
    propertyScheduleUpdate.safeParse({
      ...base,
      notification_audience: 'preferred',
    }).success
  ).toBe(false);
  expect(
    propertyScheduleUpdate.safeParse({ ...base, preferred_contractor_id: null })
      .success
  ).toBe(false);
  expect(
    propertyScheduleUpdate.safeParse({
      ...base,
      notification_audience: 'matching',
      preferred_contractor_id: null,
    }).success
  ).toBe(true);
});
