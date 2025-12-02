'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';

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

export type CalendarView = 'month' | 'week' | 'day';

export function Calendar({ events }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Debug: Log events and current date in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const eventsByMonth = events.map(e => {
        const eventDate = typeof e.date === 'string' ? new Date(e.date) : e.date;
        if (isNaN(eventDate.getTime())) return null;
        const dateStr = typeof e.date === 'string' ? e.date : e.date.toISOString();
        const dateParts = dateStr.split('T')[0].split('-');
        return {
          title: e.title,
          dateISO: dateStr,
          year: parseInt(dateParts[0]),
          month: parseInt(dateParts[1]) - 1, // 0-indexed
          day: parseInt(dateParts[2]),
        };
      }).filter(Boolean);

      if (process.env.NODE_ENV === 'development') {
        logger.debug('📅 Calendar Component Debug', {
          eventsCount: events.length,
          currentDate: currentDate.toISOString(),
          currentMonth: currentDate.getMonth(),
          currentYear: currentDate.getFullYear(),
          currentMonthName: monthNames[currentDate.getMonth()],
          eventsInCurrentMonth: eventsByMonth.filter(e => 
            e && e.month === currentDate.getMonth() && e.year === currentDate.getFullYear()
          ).length,
        });
      }
    }
  }, [events, currentDate, monthNames]);

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

  const getEventsForDay = (day: number, targetMonth?: number, targetYear?: number): CalendarEvent[] => {
    const checkMonth = targetMonth !== undefined ? targetMonth : currentDate.getMonth();
    const checkYear = targetYear !== undefined ? targetYear : currentDate.getFullYear();
    
    return events.filter(event => {
      // Convert date to Date object if it's a string (serialized from server)
      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
      
      if (isNaN(eventDate.getTime())) {
        // Invalid date, skip this event
        logger.warn('Invalid date for event', { event: event.title });
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
      
      const matches = (
        eventDay === day &&
        eventMonth === checkMonth &&
        eventYear === checkYear
      );
      
      // Debug logging for development
      if (process.env.NODE_ENV === 'development' && matches) {
        logger.info('Event matched for day', {
          day,
          eventTitle: event.title,
          eventDate: typeof event.date === 'string' ? event.date : event.date.toISOString(),
          eventDay,
          eventMonth,
          eventYear,
          checkDay: day,
          checkMonth,
          checkYear
        });
      }
      
      return matches;
    });
  };

  const { month, year, daysInMonth, startingDayOfWeek } = getMonthData(currentDate);

  // Get previous month's last days
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  
  const calendarDays = [];
  
  // Add previous month's trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    calendarDays.push({ day, isCurrentMonth: false, month: month - 1, year });
  }
  
  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, isCurrentMonth: true, month, year });
  }
  
  // Add next month's leading days to fill the grid (42 cells = 6 weeks)
  const totalCells = 42;
  const remainingCells = totalCells - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push({ day, isCurrentMonth: false, month: month + 1, year });
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
      <CalendarHeader
        month={month}
        year={year}
        monthNames={monthNames}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        view={view}
        onViewChange={setView}
      />

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

      <CalendarGrid
        calendarDays={calendarDays}
        currentDate={currentDate}
        events={events}
        getEventsForDay={getEventsForDay}
        isToday={isToday}
        getEventColor={getEventColor}
      />
    </div>
  );
}

