/** A pre-signing estimate only; the accepted agreement records the actual deadline. */
export function contractStartWarning(
  startDate: string | null | undefined,
  now = new Date()
) {
  if (!startDate || !Number.isFinite(Date.parse(startDate))) return null;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 14);
  const endDay = end.toISOString().slice(0, 10);
  if (startDate.slice(0, 10) > endDay) return null;
  const display = (date: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'long',
    }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
  return { start: display(startDate), end: display(endDay) };
}
