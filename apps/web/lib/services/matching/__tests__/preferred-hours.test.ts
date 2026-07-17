// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import {
  isWithinPreferredWindow,
  nextPreferredWindowStart,
  parsePreferredHours,
} from '../preferred-hours';

// 2026-07-17 is a Friday; London is on BST (UTC+1) in July.
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const NINE_TO_FIVE = { start: '09:00', end: '17:00' };

describe('parsePreferredHours', () => {
  it('accepts the canonical {start,end} jsonb shape', () => {
    expect(parsePreferredHours({ start: '09:00', end: '17:00' })).toEqual({
      start: '09:00',
      end: '17:00',
    });
  });

  it.each([
    null,
    undefined,
    'nine to five',
    {},
    { start: '09:00' },
    { start: 'late', end: 'later' },
  ])('rejects unusable payload %p', (payload) => {
    expect(parsePreferredHours(payload)).toBeNull();
  });
});

describe('isWithinPreferredWindow', () => {
  it('is true inside the window (Friday 11:00 London)', () => {
    const now = new Date('2026-07-17T10:00:00Z'); // 11:00 BST
    expect(isWithinPreferredWindow(WEEKDAYS, NINE_TO_FIVE, now)).toBe(true);
  });

  it('is false before the window opens (Friday 07:00 London)', () => {
    const now = new Date('2026-07-17T06:00:00Z'); // 07:00 BST
    expect(isWithinPreferredWindow(WEEKDAYS, NINE_TO_FIVE, now)).toBe(false);
  });

  it('is false on a non-preferred day even inside the hours (Saturday 11:00)', () => {
    const now = new Date('2026-07-18T10:00:00Z'); // Sat 11:00 BST
    expect(isWithinPreferredWindow(WEEKDAYS, NINE_TO_FIVE, now)).toBe(false);
  });

  it('treats empty days + no hours as always-on', () => {
    const now = new Date('2026-07-18T02:30:00Z');
    expect(isWithinPreferredWindow([], null, now)).toBe(true);
    expect(isWithinPreferredWindow(null, null, now)).toBe(true);
  });

  it('attributes an overnight window tail to the day it started', () => {
    // Friday 22:00–06:00 window; Saturday 02:00 London is inside it.
    const overnight = { start: '22:00', end: '06:00' };
    const satNight = new Date('2026-07-18T01:00:00Z'); // Sat 02:00 BST
    expect(isWithinPreferredWindow(['friday'], overnight, satNight)).toBe(true);
    // Saturday 23:00 London is a fresh Saturday window — not Friday's.
    const satLate = new Date('2026-07-18T22:00:00Z'); // Sat 23:00 BST
    expect(isWithinPreferredWindow(['friday'], overnight, satLate)).toBe(false);
  });
});

describe('nextPreferredWindowStart', () => {
  it('returns null when already inside the window (send now)', () => {
    const now = new Date('2026-07-17T10:00:00Z');
    expect(nextPreferredWindowStart(WEEKDAYS, NINE_TO_FIVE, now)).toBeNull();
  });

  it('defers an early-morning post to the 09:00 window start', () => {
    const now = new Date('2026-07-17T06:00:00Z'); // 07:00 BST Friday
    const next = nextPreferredWindowStart(WEEKDAYS, NINE_TO_FIVE, now);
    // 09:00 BST === 08:00Z, reachable exactly on the 15-min grid.
    expect(next?.toISOString()).toBe('2026-07-17T08:00:00.000Z');
  });

  it('gives up past the cap (Friday evening → Monday is >12h away)', () => {
    const now = new Date('2026-07-17T18:00:00Z'); // 19:00 BST Friday
    expect(nextPreferredWindowStart(WEEKDAYS, NINE_TO_FIVE, now)).toBeNull();
  });

  it('never defers when no hours are configured', () => {
    const now = new Date('2026-07-17T02:00:00Z');
    expect(nextPreferredWindowStart(null, null, now)).toBeNull();
  });
});
