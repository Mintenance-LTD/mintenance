'use client';

import { theme } from '@/lib/theme';
import { CalendarEvent as CalendarEventComponent } from './CalendarEvent';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  type: 'job' | 'maintenance' | 'inspection';
  status?: string;
}

interface CalendarDayProps {
  day: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  index: number;
  getEventColor: (type: string) => string;
  onDayHover?: (day: number | null, isCurrentMonth: boolean) => void;
}

export function CalendarDay({
  day,
  isCurrentMonth,
  isToday,
  events,
  index,
  getEventColor,
  onDayHover,
}: CalendarDayProps) {
  const postedJobs = isCurrentMonth ? events.filter(e => e.id.startsWith('job-posted-')) : [];
  const hasPostedJobs = postedJobs.length > 0;
  const displayEvents = events.filter(e => !e.id.startsWith('job-posted-'));

  return (
    <div
      style={{
        minHeight: '120px',
        padding: theme.spacing[3],
        borderRight: index % 7 !== 6 ? `1px solid ${theme.colors.border}` : 'none',
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: (() => {
          if (!day || !isCurrentMonth) return theme.colors.backgroundSecondary;
          return hasPostedJobs ? '#D1FAE5' : theme.colors.white;
        })(),
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={() => {
        if (day && isCurrentMonth && onDayHover) {
          onDayHover(day, isCurrentMonth);
        }
      }}
      onMouseLeave={() => {
        if (day && isCurrentMonth && onDayHover) {
          onDayHover(day, isCurrentMonth);
        }
      }}
    >
      {day && (
        <>
          <div
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.base,
              fontWeight: isToday
                ? theme.typography.fontWeight.bold
                : isCurrentMonth
                  ? theme.typography.fontWeight.semibold
                  : theme.typography.fontWeight.normal,
              color: isToday
                ? theme.colors.white
                : isCurrentMonth
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary,
              backgroundColor: isToday ? theme.colors.primary : 'transparent',
              marginBottom: theme.spacing[2],
              transition: 'all 0.2s ease',
              boxShadow: isToday ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none',
              opacity: isCurrentMonth ? 1 : 0.5,
            }}
          >
            {day}
          </div>

          {/* Posted Jobs Badge */}
          {hasPostedJobs && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                backgroundColor: '#14b8a6',
                borderRadius: theme.borderRadius.md,
                marginBottom: theme.spacing[2],
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: '#FFFFFF',
                }}
              >
                Posted jobs
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1.5] }}>
            {displayEvents.map((event) => (
              <CalendarEventComponent
                key={event.id}
                event={event}
                eventColor={getEventColor(event.type)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

