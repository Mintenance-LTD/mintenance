import { formatArrivalTime, handoffLine } from '../ContractorArrivedCard';

describe('formatArrivalTime()', () => {
  it('formats a valid timestamp as UK 24-hour time', () => {
    // 14:41 UTC — asserted against the same locale/zone the helper uses so
    // the test doesn't depend on the runner's timezone.
    const iso = '2026-07-20T14:41:00Z';
    const expected = new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(formatArrivalTime(iso)).toBe(expected);
    expect(formatArrivalTime(iso)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns null for a missing or unparseable timestamp', () => {
    // The card falls back to "On site now" rather than rendering "Invalid Date".
    expect(formatArrivalTime(null)).toBeNull();
    expect(formatArrivalTime('')).toBeNull();
    expect(formatArrivalTime('not-a-date')).toBeNull();
  });
});

describe('handoffLine()', () => {
  it('names the before-photos gate while the job is still assigned', () => {
    expect(handoffLine('assigned')).toBe(
      'Next: your contractor photographs the area before starting.'
    );
    // Same expectation when status is absent — assigned is the only state a
    // homeowner can be in while watching someone arrive.
    expect(handoffLine(undefined)).toContain('photographs the area');
  });

  it('switches once work has actually started', () => {
    expect(handoffLine('in_progress')).toBe('Work is underway.');
  });

  it('points at the photo review once complete', () => {
    expect(handoffLine('completed')).toContain('review the photos');
  });
});
