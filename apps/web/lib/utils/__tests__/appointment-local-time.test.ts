import { expect, it } from 'vitest';
import { appointmentLocalTime } from '../appointment-local-time';
it.each([
  ['2026-10-04T11:00:00Z', '2026-10-04', '12:00:00'],
  ['2026-10-03T23:30:00Z', '2026-10-04', '00:30:00'],
  ['2026-12-04T11:00:00Z', '2026-12-04', '11:00:00'],
])('keeps UK calendar date and time for %s', (iso, date, time) => {
  expect(appointmentLocalTime(new Date(iso))).toEqual({ date, time });
});
