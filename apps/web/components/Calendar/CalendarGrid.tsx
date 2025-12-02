'use client';

import { CalendarDay, type CalendarEvent } from './CalendarDay';

interface CalendarDayInfo {
  day: number;
  isCurrentMonth: boolean;
  month: number;
  year: number;
}

interface CalendarGridProps {
  calendarDays: CalendarDayInfo[];
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (day: number, targetMonth?: number, targetYear?: number) => CalendarEvent[];
  isToday: (day: number) => boolean;
  getEventColor: (type: string) => string;
}

export function CalendarGrid({
  calendarDays,
  currentDate,
  events,
  getEventsForDay,
  isToday,
  getEventColor,
}: CalendarGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      minHeight: '500px',
    }}>
      {calendarDays.map((dayInfo, index) => {
        const day = dayInfo?.day;
        const isCurrentMonth = dayInfo?.isCurrentMonth ?? false;
        const dayMonth = dayInfo?.month ?? currentDate.getMonth();
        const dayYear = dayInfo?.year ?? currentDate.getFullYear();
        const dayEvents = day ? getEventsForDay(day, dayMonth, dayYear) : [];
        const today = !!(day && isCurrentMonth && isToday(day));

        return (
          <CalendarDay
            key={index}
            day={day}
            isCurrentMonth={isCurrentMonth}
            isToday={today}
            events={dayEvents}
            index={index}
            getEventColor={getEventColor}
          />
        );
      })}
    </div>
  );
}

