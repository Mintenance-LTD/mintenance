'use client';
import { theme } from '@/lib/theme';

import { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarDay, type CalendarEvent } from './CalendarDay';
import { CalendarEvent as EventCard } from './CalendarEvent';

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2026, month, 1).toLocaleDateString('en-GB', { month: 'long' })
);
const eventColor = (type: string) =>
  type === 'maintenance'
    ? '#3F7567'
    : type === 'inspection'
      ? '#99651E'
      : '#526B88';
const dateLabel = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function Calendar({ events = [] }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const start = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    view === 'month' ? 1 : currentDate.getDate()
  );
  if (view !== 'day') start.setDate(start.getDate() - start.getDay());
  const days = Array.from(
    { length: view === 'month' ? 42 : view === 'week' ? 7 : 1 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
  const forDate = (date: Date) =>
    events.filter((event) => {
      // Date-only scheduling values must retain their intended calendar day.
      const parts =
        typeof event.date === 'string'
          ? event.date.slice(0, 10).split('-').map(Number)
          : [
              event.date.getFullYear(),
              event.date.getMonth() + 1,
              event.date.getDate(),
            ];
      return (
        parts[0] === date.getFullYear() &&
        parts[1] === date.getMonth() + 1 &&
        parts[2] === date.getDate()
      );
    });
  const move = (direction: number) =>
    setCurrentDate((date) =>
      view === 'month'
        ? new Date(date.getFullYear(), date.getMonth() + direction, 1)
        : new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + direction * (view === 'week' ? 7 : 1)
          )
    );
  const openDay = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };
  const label =
    view === 'month'
      ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : view === 'day'
        ? dateLabel(currentDate)
        : `${dateLabel(days[0])} – ${dateLabel(days[6])}`;
  const today = new Date().toDateString();
  return (
    <section
      aria-label='Schedule calendar'
      style={{
        minWidth: 0,
        background: 'var(--me-surface, #fff)',
        border: '1px solid var(--me-line, #dfe7e2)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <CalendarHeader
        month={currentDate.getMonth()}
        year={currentDate.getFullYear()}
        monthNames={monthNames}
        label={label}
        view={view}
        onViewChange={setView}
        onToday={() => setCurrentDate(new Date())}
        onPreviousMonth={() => move(-1)}
        onNextMonth={() => move(1)}
      />
      {view === 'day' ? (
        <div style={{ padding: 20, minHeight: 260 }}>
          <p
            style={{
              color: `var(--me-ink-2, ${theme.colors.textSecondary})`,
              marginBottom: 16,
            }}
          >
            {forDate(currentDate).length} events ·{' '}
            {currentDate.toLocaleDateString('en-GB', { weekday: 'long' })}
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {forDate(currentDate).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                eventColor={eventColor(event.type)}
              />
            ))}
          </div>
          {forDate(currentDate).length === 0 && (
            <p
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: `var(--me-ink-2, ${theme.colors.textSecondary})`,
              }}
            >
              Nothing scheduled for this day.
            </p>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              background: 'var(--me-bg-2, #edf3ef)',
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                style={{
                  padding: '12px 0',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {day}
              </div>
            ))}
          </div>
          <div
            data-testid='calendar-grid'
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            }}
          >
            {days.map((date, index) => (
              <CalendarDay
                key={date.toISOString()}
                day={date.getDate()}
                isCurrentMonth={
                  view === 'week' || date.getMonth() === currentDate.getMonth()
                }
                isToday={date.toDateString() === today}
                events={forDate(date)}
                index={index}
                getEventColor={eventColor}
                onSelect={() => openDay(date)}
              />
            ))}
          </div>
          <p
            style={{
              padding: '12px 16px',
              margin: 0,
              fontSize: 12,
              color: `var(--me-ink-2, ${theme.colors.textSecondary})`,
            }}
          >
            Select a date to see its full schedule.
          </p>
        </>
      )}
    </section>
  );
}
