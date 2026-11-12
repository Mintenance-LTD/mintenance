interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}
interface Booking {
  appointment_date: string;
  start_time: string;
  end_time: string;
}
type Interval = [number, number];
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function merge(intervals: Interval[]): Interval[] {
  const merged: Interval[] = [];
  for (const [start, end] of intervals
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s)
    .sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Seven civil dates starting today, counting only unbooked working intervals. */
export function availableHours(
  today: string,
  availability: Availability[],
  bookings: Booking[]
): number {
  let totalMinutes = 0;
  for (let day = 0; day < 7; day++) {
    const date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + day);
    const key = date.toISOString().slice(0, 10);
    const working = merge(
      availability
        .filter((a) => a.is_available && a.day_of_week === date.getUTCDay())
        .map((a) => [minutes(a.start_time), minutes(a.end_time)])
    );
    const busy = merge(
      bookings
        .filter((b) => b.appointment_date === key)
        .map((b) => [minutes(b.start_time), minutes(b.end_time)])
    );
    for (const [start, end] of working) {
      totalMinutes += end - start;
      for (const [busyStart, busyEnd] of busy) {
        totalMinutes -= Math.max(
          0,
          Math.min(end, busyEnd) - Math.max(start, busyStart)
        );
      }
    }
  }
  return Math.round((totalMinutes / 60) * 10) / 10;
}
