'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { Calendar } from '@/components/Calendar/Calendar';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
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

export function SchedulingClient2025({
  events,
  userInfo,
}: SchedulingClient2025Props) {
  // Hydration-safe theme detection so the Mint Editorial shell wraps
  // this surface consistently with the rest of the homeowner pages.
  // Legacy chrome (white header strip + min-h-screen bg) stays intact
  // until the theme cookie flips.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const jobCount = events.filter((e) => e.type === 'job').length;
  const appointmentCount = events.filter((e) => e.type === 'inspection').length;
  const maintenanceCount = events.filter(
    (e) => e.type === 'maintenance'
  ).length;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingEvents = events
    .filter((event) => {
      const eventDate =
        typeof event.date === 'string' ? new Date(event.date) : event.date;
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
        return 'bg-blue-100 text-blue-700';
      case 'inspection':
        return 'bg-purple-100 text-purple-700';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'job':
        return 'Job';
      case 'inspection':
        return 'Appointment';
      case 'maintenance':
        return 'Maintenance';
      default:
        return type;
    }
  };

  const statsGrid = (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8'>
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <CalendarIcon className='w-5 h-5 text-teal-600' />
          <p className='text-gray-600 text-sm font-medium'>Total Events</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>{events.length}</p>
      </div>
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <Clock className='w-5 h-5 text-blue-600' />
          <p className='text-gray-600 text-sm font-medium'>Jobs</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>{jobCount}</p>
      </div>
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <User className='w-5 h-5 text-purple-600' />
          <p className='text-gray-600 text-sm font-medium'>Appointments</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          {appointmentCount}
        </p>
      </div>
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <MapPin className='w-5 h-5 text-amber-600' />
          <p className='text-gray-600 text-sm font-medium'>Maintenance</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          {maintenanceCount}
        </p>
      </div>
    </div>
  );

  const calendarAndUpcoming = (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
      <div className='lg:col-span-2'>
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className='text-xl font-semibold text-gray-900 mb-6'>Calendar</h2>
          <Calendar events={events} />
        </div>
      </div>

      <div className='space-y-6'>
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Upcoming Events
          </h3>

          {upcomingEvents.length === 0 ? (
            <div className='text-center py-8'>
              <CalendarIcon className='w-12 h-12 text-gray-300 mx-auto mb-2' />
              <p className='text-sm text-gray-600'>No upcoming events</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {upcomingEvents.map((event) => {
                const eventDate =
                  typeof event.date === 'string'
                    ? new Date(event.date)
                    : event.date;
                return (
                  <div
                    key={event.id}
                    className='p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
                  >
                    <h4 className='font-medium text-gray-900 mb-2'>
                      {event.title}
                    </h4>
                    <div className='flex items-center gap-2 text-sm text-gray-600'>
                      <CalendarIcon className='w-4 h-4' />
                      <span>
                        {eventDate.toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div
                      className={`mt-2 inline-block px-2 py-1 rounded-lg text-xs font-medium ${getEventTypeColor(event.type)}`}
                    >
                      {getEventTypeLabel(event.type)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className='bg-teal-50 rounded-xl border border-teal-200 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Need Help?
          </h3>
          <p className='text-sm text-gray-600 mb-4'>
            Our team is here to assist you with scheduling and appointments.
          </p>
          <Link
            href='/help'
            className='w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2'
          >
            <User className='w-4 h-4' />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );

  if (isMintEditorial) {
    return (
      <HomeownerPageWrapper>
        <div className='col me-legacy-fit' style={{ gap: 18 }}>
          <div className='col' style={{ gap: 4 }}>
            <h1 className='t-h1'>My Schedule</h1>
            <p className='t-body'>
              Your jobs, appointments, and upcoming events.
            </p>
          </div>
          {statsGrid}
          {calendarAndUpcoming}
        </div>
      </HomeownerPageWrapper>
    );
  }

  return (
    <HomeownerPageWrapper>
      <div className='min-h-screen bg-gray-50'>
        <div className='bg-white border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-semibold text-gray-900'>
                  My Schedule
                </h1>
                <p className='text-gray-600 mt-1'>
                  Your jobs, appointments, and upcoming events
                </p>
              </div>
            </div>
            {statsGrid}
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {calendarAndUpcoming}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}
