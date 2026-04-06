'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Appointment } from './types';

interface CalendarViewProps {
  selectedDate: Date;
  view: 'week' | 'month';
  setView: (v: 'week' | 'month') => void;
  appointments: Appointment[];
}

export function CalendarView({ selectedDate, view, setView, appointments }: CalendarViewProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Calendar</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-slate-900 min-w-[140px] text-center">
              {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="bg-slate-50 text-center font-semibold text-slate-700 py-3 text-sm">
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const today = new Date();
          const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Adjust for Monday start
          const dayNumber = i - startingDayOfWeek + 1;
          const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber);
          const isToday = currentDate.toDateString() === today.toDateString();
          const isCurrentMonth = dayNumber > 0 && dayNumber <= new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

          // Find appointments for this day
          const dayAppointments = isCurrentMonth ? appointments.filter((apt) => {
            const aptDate = new Date(apt.date);
            return aptDate.toDateString() === currentDate.toDateString();
          }) : [];

          return (
            <div
              key={i}
              className="min-h-[90px] p-2 bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className={`text-sm mb-1 flex items-center justify-center w-8 h-8 rounded-xl mx-auto font-semibold ${
                isToday ? 'bg-teal-600 text-white' : isCurrentMonth ? 'text-slate-900 hover:bg-slate-100' : 'text-slate-300'
              }`}>
                {isCurrentMonth ? dayNumber : ''}
              </div>
              {dayAppointments.length > 0 && (
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map((apt) => (
                    <div key={apt.id} className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs truncate font-medium border border-teal-100">
                      {apt.time}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-xs text-center text-slate-500">+{dayAppointments.length - 2} more</div>
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
