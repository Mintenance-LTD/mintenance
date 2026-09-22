export function advanceRecurringDate(value: string, frequency: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Invalid schedule date');
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error('Invalid schedule date');
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  else {
    const months: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      biannual: 6,
      annual: 12,
      yearly: 12,
    };
    if (!months[frequency]) throw new Error('Unsupported schedule frequency');
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months[frequency]);
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
    ).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
