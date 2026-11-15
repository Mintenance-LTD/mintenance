import { describe, it, expect } from 'vitest';
import {
  canViewBidJob,
  formatJobBudget,
  requirementLines,
} from '@/lib/contractor/bid-details';
import {
  effectiveQuoteStatus,
  quoteHasExpired,
} from '@/lib/quotes/quote-status';

describe('bid details and linked quote state', () => {
  it('allows public opportunities and own bid history, never unrelated assigned or archived jobs', () => {
    expect(canViewBidJob({ status: 'posted' }, false)).toBe(true);
    expect(
      canViewBidJob({ status: 'assigned', contractor_id: 'another' }, false)
    ).toBe(false);
    expect(canViewBidJob({ status: 'draft' }, false)).toBe(false);
    expect(
      canViewBidJob({ status: 'posted', archived_at: '2026-11-01' }, false)
    ).toBe(false);
    expect(
      canViewBidJob({ status: 'completed', contractor_id: 'another' }, true)
    ).toBe(true);
  });
  it('renders missing budgets and structured legacy requirements without NaN or object coercion', () => {
    for (const value of [null, undefined, '', 'unknown', NaN, Infinity, {}, -1])
      expect(formatJobBudget(value)).toBe('Not specified');
    expect(formatJobBudget('2.2')).toBe('£2.20');
    expect(
      requirementLines({
        materials_included: true,
        access: ['Rear door', 'Call first'],
      })
    ).toEqual(['materials included: Yes', 'access: Rear door; Call first']);
  });
  it('uses linked bid outcomes before the stale quote status or expiry date', () => {
    const quote = { status: 'sent', valid_until: '2026-01-01' };
    expect(effectiveQuoteStatus(quote, 'rejected')).toBe('rejected');
    expect(effectiveQuoteStatus(quote, 'accepted')).toBe('accepted');
    expect(effectiveQuoteStatus(quote, 'pending', new Date('2026-11-15'))).toBe(
      'expired'
    );
    expect(effectiveQuoteStatus({ ...quote, status: 'draft' })).toBe('draft');
  });
  it('keeps quotes valid through their UK expiry date and does not invent expiry dates', () => {
    expect(
      quoteHasExpired('2026-07-01', new Date('2026-07-01T22:59:59Z'))
    ).toBe(false);
    expect(
      quoteHasExpired('2026-07-01', new Date('2026-07-01T23:00:00Z'))
    ).toBe(true);
    expect(quoteHasExpired(null)).toBe(false);
  });
});
