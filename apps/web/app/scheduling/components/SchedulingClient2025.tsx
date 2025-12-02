'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { Calendar } from '@/components/Calendar/Calendar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { CalendarEvent } from '../lib/types';

interface SchedulingClient2025Props {
  events: CalendarEvent[];
  userInfo: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

export function SchedulingClient2025({ events, userInfo }: SchedulingClient2025Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Filter events for selected date
  const eventsForSelectedDate = events.filter((event) => {
    const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Count events by type
  const jobCount = events.filter((e) => e.type === 'job').length;
  const appointmentCount = events.filter((e) => e.type === 'inspection').length;
  const maintenanceCount = events.filter((e) => e.type === 'maintenance').length;

  // Upcoming events (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingEvents = events
    .filter((event) => {
      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
      return eventDate >= today && eventDate <= nextWeek;
    })
    .sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'job':
        return 'bg-teal-100 text-teal-700';
      case 'appointment':
        return 'bg-purple-100 text-purple-700';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'job':
        return '🔧';
      case 'inspection':
        return '📅';
      case 'maintenance':
        return '🔄';
      default:
        return '📋';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar userRole={userInfo.role as any} userInfo={userInfo} />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <h1 className="text-4xl font-bold mb-2">Schedule</h1>
            <p className="text-teal-100 text-lg">Manage your jobs, appointments, and maintenance</p>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-6 mt-8">
              {[
                { label: 'Total Events', value: events.length, icon: '📋' },
                { label: 'Jobs', value: jobCount, icon: '🔧' },
                { label: 'Appointments', value: appointmentCount, icon: '📅' },
                { label: 'Maintenance', value: maintenanceCount, icon: '🔄' },
              ].map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-teal-100 text-sm">{stat.label}</div>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          <div className="grid grid-cols-12 gap-6">
            {/* Calendar - Left Column */}
            <div className="col-span-12 lg:col-span-8">
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>

                  {/* View Selector */}
                  <div className="flex items-center gap-2">
                    {['month', 'week', 'day'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v as any)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                          view === v
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar Component */}
                <Calendar events={events} />
              </MotionDiv>
            </div>

            {/* Sidebar - Right Column */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Today's Events */}
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>

                {eventsForSelectedDate.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">No events scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventsForSelectedDate.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getEventTypeIcon(event.type)}</span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getEventTypeColor(event.type)}`}>
                              {event.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MotionDiv>

              {/* Upcoming Events */}
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming (Next 7 Days)</h3>

                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => {
                      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
                      return (
                        <div
                          key={event.id}
                          className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{getEventTypeIcon(event.type)}</span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-500">
                                  {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getEventTypeColor(event.type)}`}>
                                  {event.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </MotionDiv>

              {/* Quick Actions */}
              <MotionDiv
                className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-sm p-6 text-white"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl font-medium transition-colors text-left flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule New Appointment
                  </button>
                  <button className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl font-medium transition-colors text-left flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View All Events
                  </button>
                </div>
              </MotionDiv>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
