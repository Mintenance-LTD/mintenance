export function appointmentTime(time?: string, endTime?: string): string {
  if (!time) return 'Time not set';
  return endTime
    ? `${time.slice(0, 5)}–${endTime.slice(0, 5)}`
    : time.slice(0, 5);
}

export function appointmentDuration(value?: string): string {
  const match = value?.match(/^(\d+)m$/);
  if (!match) return value || 'Duration not set';
  const minutes = Number(match[1]);
  const hours = Math.floor(minutes / 60);
  return (
    [hours ? `${hours}h` : '', minutes % 60 ? `${minutes % 60}m` : '']
      .filter(Boolean)
      .join(' ') || '0m'
  );
}

export function appointmentAddress(value?: string): string | undefined {
  if (!value) return undefined;
  return [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ].join(', ');
}
