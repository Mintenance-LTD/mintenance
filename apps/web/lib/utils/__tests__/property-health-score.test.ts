// globals: true in vitest.config
import { calculatePropertyHealthScore } from '../property-health-score';

/**
 * Regression coverage for the 2026-07-26 property-detail date bug.
 *
 * `/properties/[id]/page.tsx` used to pre-format each job date with
 * `toLocaleDateString('en-GB')` → "dd/mm/yyyy", then feed that string
 * down as `lastServiceDate`. `calculatePropertyHealthScore` parses it
 * with `new Date(...)`, but V8 reads "dd/mm/yyyy" as an INVALID DATE
 * when the day is > 12 (and as the wrong US month when day <= 12). An
 * Invalid Date is still a non-empty string, so the `if (lastServiceDate)`
 * recency branch runs, `daysSinceService` becomes NaN, every `NaN <= n`
 * comparison is false, and the property silently earns ZERO recency
 * points. The fix passes the raw ISO `created_at` down instead; these
 * tests pin that contract.
 */
describe('calculatePropertyHealthScore recency (ISO lastServiceDate)', () => {
  const base = {
    completedJobs: 1,
    activeJobs: 0,
    totalSpent: 600,
    propertyAge: 10,
    recentCategories: ['plumbing'],
  };

  const isoDaysAgo = (days: number): string => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
  };

  it('awards full recency points for an ISO service date within 30 days', () => {
    const recent = calculatePropertyHealthScore({
      ...base,
      lastServiceDate: isoDaysAgo(5),
    });
    const stale = calculatePropertyHealthScore({
      ...base,
      lastServiceDate: isoDaysAgo(400),
    });

    // A recent service must score strictly higher than a >1yr-old one.
    // With the old dd/mm/yyyy bug both collapsed to NaN → identical.
    expect(recent.score).toBeGreaterThan(stale.score);
    expect(recent.recommendations).not.toContain(
      'URGENT: No maintenance in over a year - schedule immediate inspection'
    );
  });

  it('flags a >1yr-old ISO service date as urgent', () => {
    const result = calculatePropertyHealthScore({
      ...base,
      lastServiceDate: isoDaysAgo(400),
    });
    expect(result.recommendations).toContain(
      'URGENT: No maintenance in over a year - schedule immediate inspection'
    );
  });

  it('scores an ISO date higher than the legacy dd/mm/yyyy string it replaced', () => {
    // Same real day, two encodings. day=26 > 12 → "26/07/2026" is an
    // Invalid Date in V8, which is exactly the pre-fix bug.
    const iso = calculatePropertyHealthScore({
      ...base,
      lastServiceDate: isoDaysAgo(3),
    });
    const legacyDdMmYyyy = calculatePropertyHealthScore({
      ...base,
      lastServiceDate: '26/07/2026',
    });

    // The ISO (correct) input earns recency points the broken string
    // could not — proving the page-level fix actually moves the score.
    expect(iso.score).toBeGreaterThan(legacyDdMmYyyy.score);
  });
});
