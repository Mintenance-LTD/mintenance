'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Video, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/Calendar/Calendar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { CalendarEvent } from '../lib/types';
import toast from 'react-hot-toast';

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

interface TimeSlot {
  time: string;
  available: boolean;
  contractorId?: string;
  contractorName?: string;
}

export function SchedulingClient2025({ events, userInfo }: SchedulingClient2025Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Mock available time slots
  const getAvailableTimeSlots = (date: Date | null): TimeSlot[] => {
    if (!date) return [];

    return [
      { time: '09:00 AM', available: true, contractorName: 'John Smith' },
      { time: '10:00 AM', available: true, contractorName: 'Jane Doe' },
      { time: '11:00 AM', available: false },
      { time: '12:00 PM', available: true, contractorName: 'Mike Johnson' },
      { time: '01:00 PM', available: false },
      { time: '02:00 PM', available: true, contractorName: 'Sarah Williams' },
      { time: '03:00 PM', available: true, contractorName: 'Tom Brown' },
      { time: '04:00 PM', available: true, contractorName: 'Emily Davis' },
      { time: '05:00 PM', available: false },
    ];
  };

  const availableSlots = getAvailableTimeSlots(selectedDate);

  // Filter events for selected date
  const eventsForSelectedDate = selectedDate ? events.filter((event) => {
    const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  }) : [];

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

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select a date and time slot');
      return;
    }
    toast.success(`Appointment booked for ${selectedDate.toLocaleDateString()} at ${selectedTimeSlot}`);
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header - Airbnb Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Book an Appointment</h1>
              <p className="text-gray-600 mt-1">
                Select a date and time to schedule your appointment
              </p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-teal-600" />
                <p className="text-gray-600 text-sm font-medium">Total Events</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-gray-600 text-sm font-medium">Jobs</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{jobCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-purple-600" />
                <p className="text-gray-600 text-sm font-medium">Appointments</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{appointmentCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                <p className="text-gray-600 text-sm font-medium">Maintenance</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{maintenanceCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar - Airbnb Style Date Picker */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Date</h2>

              {/* Calendar Component */}
              <Calendar events={events} />

              {/* Time Slots Section */}
              {selectedDate && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Available Times for {selectedDate.toLocaleDateString('en-GB', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>

                  {/* Time Period Selector */}
                  <div className="flex gap-2 mb-6">
                    {['Morning', 'Afternoon', 'Evening'].map((period) => (
                      <button
                        key={period}
                        className="px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {period}
                      </button>
                    ))}
                  </div>

                  {/* Time Slots Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.time)}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          selectedTimeSlot === slot.time
                            ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600'
                            : slot.available
                            ? 'border-gray-300 hover:border-teal-600 hover:bg-teal-50'
                            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-semibold text-sm">{slot.time}</div>
                        {slot.available && slot.contractorName && (
                          <div className="text-xs text-gray-500 mt-1">{slot.contractorName}</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Book Button */}
                  {selectedTimeSlot && (
                    <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Appointment Details</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedDate.toLocaleDateString()} at {selectedTimeSlot}
                          </p>
                        </div>
                        <button
                          onClick={handleBookAppointment}
                          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
                    return (
                      <div
                        key={event.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{event.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                          <span>
                            {eventDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className={`mt-2 inline-block px-2 py-1 rounded-lg text-xs font-medium ${getEventTypeColor(event.type)}`}>
                          {event.type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help Card */}
            <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our team is here to assist you with scheduling and appointments.
              </p>
              <button className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
