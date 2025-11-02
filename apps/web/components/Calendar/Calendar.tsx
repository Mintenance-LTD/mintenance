'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string; // Accept both Date and string (dates serialize when passed from server)
  type: 'job' | 'maintenance' | 'inspection';
  status?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
}

export function Calendar({ events }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const router = useRouter();

  // Debug: Log events and current date in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Calendar Component Debug:', {
        eventsCount: events.length,
        currentDate: currentDate.toISOString(),
        currentMonth: currentDate.getMonth(),
        currentYear: currentDate.getFullYear(),
        events: events.slice(0, 5).map(e => ({
          title: e.title,
          date: typeof e.date === 'string' ? e.date : e.date.toISOString(),
        }))
      });
    }
  }, [events, currentDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { year, month, daysInMonth, startingDayOfWeek };
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number): CalendarEvent[] => {
    return events.filter(event => {
      // Convert date to Date object if it's a string (serialized from server)
      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
      
      if (isNaN(eventDate.getTime())) {
        // Invalid date, skip this event
        console.warn('Invalid date for event:', event);
        return false;
      }
      
      // Normalize dates to local timezone to avoid timezone conversion issues
      // When an ISO string like "2025-11-01T12:00:00Z" is parsed, it might shift to local time
      // We need to extract the date components from the ISO string directly or use UTC methods
      let eventYear: number;
      let eventMonth: number;
      let eventDay: number;
      
      if (typeof event.date === 'string') {
        // Parse ISO string directly to avoid timezone shifts
        const dateStr = event.date.split('T')[0]; // Get just the date part "YYYY-MM-DD"
        const [year, month, day] = dateStr.split('-').map(Number);
        eventYear = year;
        eventMonth = month - 1; // JavaScript months are 0-indexed
        eventDay = day;
      } else {
        // Already a Date object, use local date methods
        eventYear = eventDate.getFullYear();
        eventMonth = eventDate.getMonth();
        eventDay = eventDate.getDate();
      }
      
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      const matches = (
        eventDay === day &&
        eventMonth === currentMonth &&
        eventYear === currentYear
      );
      
      // Debug logging for development
      if (process.env.NODE_ENV === 'development' && matches) {
        console.log('Event matched for day', day, ':', {
          eventTitle: event.title,
          eventDate: typeof event.date === 'string' ? event.date : event.date.toISOString(),
          eventDay,
          eventMonth,
          eventYear,
          currentDay: day,
          currentMonth,
          currentYear
        });
      }
      
      return matches;
    });
  };

  const { month, year, daysInMonth, startingDayOfWeek } = getMonthData(currentDate);

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'job':
        return '#3B82F6'; // Blue
      case 'maintenance':
        return '#10B981'; // Green
      case 'inspection':
        return '#F59E0B'; // Amber
      default:
        return theme.colors.primary;
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      border: `1px solid ${theme.colors.border}`,
      overflow: 'hidden',
    }}>
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[6],
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: 0,
        }}>
          {monthNames[month]} {year}
        </h2>

        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
          <button
            onClick={goToToday}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
          >
            Today
          </button>

          <div style={{ display: 'flex', gap: theme.spacing[1] }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
            >
              <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
            </button>

            <button
              onClick={goToNextMonth}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
            >
              <Icon name="chevronRight" size={20} color={theme.colors.textPrimary} />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.backgroundSecondary,
      }}>
        {daysOfWeek.map((day) => (
          <div
            key={day}
            style={{
              padding: theme.spacing[3],
              textAlign: 'center',
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        minHeight: '500px',
      }}>
        {calendarDays.map((day, index) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const today = day && isToday(day);

          return (
            <div
              key={index}
              style={{
                minHeight: '100px',
                padding: theme.spacing[2],
                borderRight: `1px solid ${theme.colors.border}`,
                borderBottom: `1px solid ${theme.colors.border}`,
                backgroundColor: day ? theme.colors.surface : theme.colors.backgroundSecondary,
                position: 'relative',
              }}
            >
              {day && (
                <>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: theme.borderRadius.full,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: today ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium,
                      color: today ? theme.colors.surface : theme.colors.textPrimary,
                      backgroundColor: today ? theme.colors.primary : 'transparent',
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    {day}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                    {dayEvents.map((event) => {
                      // Extract job ID from event ID (handle prefixed IDs like "job-posted-{id}")
                      const jobId = event.id.replace(/^(job-posted-|appointment-|meeting-|job-scheduled-|maintenance-)/, '');
                      const isJobEvent = event.id.startsWith('job-posted-') || event.id.startsWith('job-scheduled-') || !event.id.includes('-');
                      
                      return (
                      <div
                        key={event.id}
                        onClick={() => {
                          // Only navigate to job page if it's a job event, not maintenance or subscription
                          if (isJobEvent && jobId) {
                            router.push(`/jobs/${jobId}`);
                          }
                        }}
                        role={isJobEvent ? "button" : undefined}
                        tabIndex={isJobEvent ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (isJobEvent && jobId && (e.key === 'Enter' || e.key === ' ')) {
                            router.push(`/jobs/${jobId}`);
                          }
                        }}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: `${getEventColor(event.type)}15`,
                          borderLeft: `3px solid ${getEventColor(event.type)}`,
                          borderRadius: theme.borderRadius.sm,
                          fontSize: '10px',
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textPrimary,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(2px)';
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.opacity = '1';
                        }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

