/** Convert an instant to UK appointment columns while preserving the actual visit duration. */
export function rescheduledVisitFields(
  instant: string,
  durationMinutes: number
) {
  const date = new Date(instant);
  if (
    !Number.isFinite(date.getTime()) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  )
    throw new Error(
      'Unable to determine this visit’s date or duration. Reload the visit.'
    );
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const total =
    Number(parts.hour) * 60 + Number(parts.minute) + durationMinutes;
  if (total >= 1440)
    throw new Error(
      'This visit would run past midnight. Choose an earlier start or create separate visits.'
    );
  return {
    appointmentDate: `${parts.year}-${parts.month}-${parts.day}`,
    startTime: `${parts.hour}:${parts.minute}`,
    endTime: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
  };
}
