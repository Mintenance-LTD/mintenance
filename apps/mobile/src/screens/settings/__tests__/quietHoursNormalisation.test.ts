/**
 * Quiet-hours client↔server contract.
 *
 * 2026-07-31 audit P2: NotificationPreferencesScreen's HHMM validator is
 * deliberately permissive (accepts "9:00"), but the draft was PATCHed
 * verbatim to /api/user/notification-preferences, whose Zod schema demands
 * a two-digit hour. "9:00" therefore passed client validation and 400'd on
 * the server, surfacing as a bare "Save failed" with no indication of what
 * was wrong — and "9:00" is perfectly valid 24-hour time, so the user had
 * no way to guess.
 *
 * The fix normalises rather than tightening. These tests pin BOTH halves so
 * the two regexes can't silently drift apart again.
 */
import { HHMM as CLIENT_HHMM, normaliseHHMM } from '../quietHours';

/**
 * Copied verbatim from apps/web/app/api/user/notification-preferences/route.ts.
 * If that route's regex changes, this test must change with it — which is
 * exactly the drift alarm we want.
 */
const SERVER_TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

describe('normaliseHHMM', () => {
  it('pads a single-digit hour to the server contract', () => {
    expect(normaliseHHMM('9:00')).toBe('09:00');
    expect(normaliseHHMM('0:30')).toBe('00:30');
    expect(normaliseHHMM('7:05')).toBe('07:05');
  });

  it('leaves an already-canonical value untouched', () => {
    expect(normaliseHHMM('09:00')).toBe('09:00');
    expect(normaliseHHMM('22:00')).toBe('22:00');
    expect(normaliseHHMM('23:59')).toBe('23:59');
  });

  it('trims incidental whitespace', () => {
    expect(normaliseHHMM('  9:00  ')).toBe('09:00');
  });

  it('passes through values it cannot parse, leaving them to the validator', () => {
    // Not this helper's job to reject — the HHMM check already ran.
    expect(normaliseHHMM('nonsense')).toBe('nonsense');
    expect(normaliseHHMM('')).toBe('');
  });
});

describe('client → server contract', () => {
  // The regression: every value the CLIENT accepts must, after
  // normalisation, satisfy the SERVER.
  const clientAccepted = [
    '9:00',
    '09:00',
    '0:00',
    '00:00',
    '1:30',
    '10:15',
    '22:00',
    '23:59',
    '7:05',
  ];

  it.each(clientAccepted)(
    'client-valid %s normalises to something the server accepts',
    (value) => {
      expect(CLIENT_HHMM.test(value)).toBe(true);
      expect(SERVER_TIME.test(normaliseHHMM(value))).toBe(true);
    }
  );

  it('demonstrates the original bug: the raw single-digit value was server-invalid', () => {
    expect(CLIENT_HHMM.test('9:00')).toBe(true);
    // What used to be sent — rejected with 400 "Invalid preference payload".
    expect(SERVER_TIME.test('9:00')).toBe(false);
    // What is sent now.
    expect(SERVER_TIME.test(normaliseHHMM('9:00'))).toBe(true);
  });
});
