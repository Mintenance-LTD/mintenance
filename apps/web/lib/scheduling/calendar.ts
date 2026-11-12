export type CalendarViewMode = 'week' | 'month';

// Appointment dates are civil dates, not UTC instants. Never parse YYYY-MM-DD
// with new Date(string) for browser rendering: that shifts a day west of UTC.
export function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function calendarDays(selected: Date, view: CalendarViewMode): Date[] {
  const first = new Date(
    selected.getFullYear(),
    selected.getMonth(),
    view === 'month' ? 1 : selected.getDate()
  );
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    selected.getFullYear(),
    selected.getMonth() + 1,
    0
  ).getDate();
  const length =
    view === 'week' ? 7 : Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from(
    { length },
    (_, index) =>
      new Date(
        first.getFullYear(),
        first.getMonth(),
        first.getDate() - offset + index
      )
  );
}

export function moveCalendar(
  selected: Date,
  view: CalendarViewMode,
  direction: -1 | 1
): Date {
  return view === 'week'
    ? new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate() + direction * 7
      )
    : new Date(selected.getFullYear(), selected.getMonth() + direction, 1);
}
