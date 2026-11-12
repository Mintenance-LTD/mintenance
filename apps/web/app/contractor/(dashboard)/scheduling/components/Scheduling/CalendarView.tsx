'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Appointment } from './types';
import { calendarDays, dateKey, moveCalendar } from '@/lib/scheduling/calendar';

interface CalendarViewProps {
  selectedDate: Date;
  view: 'week' | 'month';
  setView: (v: 'week' | 'month') => void;
  setSelectedDate: (date: Date) => void;
  appointments: Appointment[];
}

export function CalendarView({
  selectedDate,
  view,
  setView,
  setSelectedDate,
  appointments,
}: CalendarViewProps) {
  const days = calendarDays(selectedDate, view);
  const todayKey = dateKey(new Date());
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className='bg-white rounded-2xl border border-slate-200 p-8 shadow-sm'
    >
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-bold text-slate-900'>Calendar</h2>
        <div className='flex items-center gap-3'>
          <div className='flex gap-1 bg-slate-100 p-1 rounded-xl'>
            <button
              type='button'
              aria-pressed={view === 'week'}
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'week'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              type='button'
              aria-pressed={view === 'month'}
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'month'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <button type='button' aria-label={`Previous ${view}`} onClick={() => setSelectedDate(moveCalendar(selectedDate, view, -1))} className='p-2 hover:bg-slate-100 rounded-xl transition-all'>
              <ChevronLeft className='w-5 h-5 text-slate-700' />
            </button>
            <span className='px-4 py-2 text-sm font-semibold text-slate-900 min-w-[140px] text-center'>
              {view === 'week' ? `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : selectedDate.toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button type='button' aria-label={`Next ${view}`} onClick={() => setSelectedDate(moveCalendar(selectedDate, view, 1))} className='p-2 hover:bg-slate-100 rounded-xl transition-all'>
              <ChevronRight className='w-5 h-5 text-slate-700' />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className='grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className='bg-slate-50 text-center font-semibold text-slate-700 py-3 text-sm'
          >
            {day}
          </div>
        ))}
        {days.map((currentDate) => {
          const key = dateKey(currentDate);
          const isToday = key === todayKey;
          const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth();
          const dayAppointments = appointments.filter(apt => apt.date === key && apt.status !== 'cancelled');

          return (
            <div
              key={key}
              aria-label={currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              className='min-h-[90px] p-2 bg-white'
            >
              <div
                className={`text-sm mb-1 flex items-center justify-center w-8 h-8 rounded-xl mx-auto font-semibold ${
                  isToday
                    ? 'bg-teal-600 text-white'
                    : isCurrentMonth
                      ? 'text-slate-900 hover:bg-slate-100'
                      : 'text-slate-300'
                }`}
              >
                {currentDate.getDate()}
              </div>
              {dayAppointments.length > 0 && (
                <div className='space-y-1'>
                  {dayAppointments.slice(0, 2).map((apt) => (
                    <div
                      key={apt.id}
                      className='px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs truncate font-medium border border-teal-100'
                    >
                      <span title={`${apt.time} · ${apt.title}`}>{apt.time} · {apt.title}</span>
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className='text-xs text-center text-slate-500'>
                      +{dayAppointments.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MotionDiv>
  );
}
