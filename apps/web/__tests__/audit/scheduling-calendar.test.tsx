import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { CalendarView } from '@/app/contractor/(dashboard)/scheduling/components/Scheduling/CalendarView';
import { calendarDays, dateKey, moveCalendar } from '@/lib/scheduling/calendar';
import { availableHours } from '@/lib/scheduling/available-hours';

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
afterEach(cleanup);
it.each([
  [2026, 1, 28],
  [2028, 1, 29],
  [2026, 10, 30],
  [2026, 7, 31],
])('includes every day of %s/%s', (year, month, count) => {
  const days = calendarDays(new Date(year, month, 15), 'month');
  expect(days.filter((d) => d.getMonth() === month)).toHaveLength(count);
  expect(days.length % 7).toBe(0);
  expect(days[0].getDay()).toBe(1);
});
it('keeps civil dates across month/year and DST boundaries', () => {
  expect(dateKey(moveCalendar(new Date(2026, 11, 31), 'month', 1))).toBe(
    '2027-01-01'
  );
  expect(calendarDays(new Date(2026, 2, 29), 'week').map(dateKey)).toEqual([
    '2026-03-23',
    '2026-03-24',
    '2026-03-25',
    '2026-03-26',
    '2026-03-27',
    '2026-03-28',
    '2026-03-29',
  ]);
});
it('navigates months, renders week dates, and includes the November 30 appointment', () => {
  function Schedule() {
    const [date, setDate] = useState(new Date(2026, 10, 30));
    const [view, setView] = useState<'week' | 'month'>('month');
    return (
      <CalendarView
        selectedDate={date}
        setSelectedDate={setDate}
        view={view}
        setView={setView}
        appointments={[
          {
            id: 'a',
            title: 'Boiler visit',
            client: 'Test',
            date: '2026-11-30',
            time: '11:00',
            duration: '60m',
            type: 'onsite',
            status: 'confirmed',
          },
        ]}
      />
    );
  }
  render(<Schedule />);
  expect(screen.getByLabelText('30 November 2026')).toHaveTextContent(
    'Boiler visit'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('December 2026')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
  expect(
    screen.getByRole('button', { name: 'Week', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByLabelText('30 November 2026')).toBeNull();
  expect(screen.getByLabelText('1 November 2026')).toBeTruthy();
});
it('uses saved hours and subtracts overlapping bookings only within working hours', () => {
  const availability = [1, 2].map((day) => ({
    day_of_week: day,
    start_time: '09:00:00',
    end_time: '17:00:00',
    is_available: true,
  }));
  expect(availableHours('2026-11-12', availability, [])).toBe(16);
  expect(
    availableHours('2026-11-12', availability, [
      {
        appointment_date: '2026-11-16',
        start_time: '08:00',
        end_time: '10:00',
      },
      {
        appointment_date: '2026-11-16',
        start_time: '09:30',
        end_time: '11:00',
      },
      {
        appointment_date: '2026-11-17',
        start_time: '16:30',
        end_time: '18:00',
      },
      {
        appointment_date: '2026-11-18',
        start_time: '09:00',
        end_time: '17:00',
      },
    ])
  ).toBe(13.5);
  expect(availableHours('2026-11-12', [], [])).toBe(0);
});
