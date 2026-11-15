import { appointmentLocalTime } from '@/lib/utils/appointment-local-time';

export function ukDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = appointmentLocalTime(date);
  return `${local.date}T${local.time.slice(0, 5)}`;
}

/** Resolve a UK wall-clock input without relying on the browser/server zone. */
export function ukDateTimeToISO(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Enter a valid date and time.');
  const epoch = Date.parse(`${value}:00Z`);
  const candidates = [epoch, epoch - 60 * 60 * 1000]
    .filter(Number.isFinite)
    .map((time) => new Date(time).toISOString())
    .filter((iso) => ukDateTimeInput(iso) === value);
  if (candidates.length === 0)
    throw new Error(
      'This UK time does not exist. Choose a valid time outside the daylight-saving change.'
    );
  if (candidates.length > 1)
    throw new Error(
      'This UK time occurs twice when the clocks change. Choose a time outside that hour.'
    );
  return candidates[0];
}

export function formatUKSchedule(value: string | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
