/** Calendar dates for UK property follow-ups, independent of the device timezone. */
const london = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function propertyFollowupDate(
  instant: string | null | undefined
): string {
  if (!instant || !Number.isFinite(Date.parse(instant))) return '';
  const parts = Object.fromEntries(
    london.formatToParts(new Date(instant)).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** End of the selected London day; invalid or normalised dates are rejected. */
export function propertyFollowupDeadline(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (Number(date.slice(0, 4)) < 1000) return null;
  const candidate = Date.parse(`${date}T23:59:59.000Z`);
  if (
    !Number.isFinite(candidate) ||
    new Date(candidate).toISOString().slice(0, 10) !== date
  )
    return null;
  const parts = Object.fromEntries(
    london.formatToParts(new Date(candidate)).map((p) => [p.type, p.value])
  );
  const represented = Date.parse(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000Z`
  );
  return new Date(candidate - (represented - candidate)).toISOString();
}
