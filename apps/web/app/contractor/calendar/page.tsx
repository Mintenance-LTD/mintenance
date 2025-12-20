'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  MapPin,
  User,
  Video,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

interface Event {
  id: string;
  title: string;
  type: 'job' | 'appointment' | 'blocked' | 'available';
  date: Date;
  startTime: string;
  endTime: string;
  client?: string;
  location?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

export default function ContractorCalendarPage2025() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);

  // Mock events data - Using real dates for better demo
  const today = new Date();
  const events: Event[] = [
    {
      id: 'EVT-001',
      title: 'Kitchen sink replacement',
      type: 'job',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      startTime: '09:00',
      endTime: '12:00',
      client: 'Sarah Johnson',
      location: '123 Oak Street, London',
      status: 'confirmed',
    },
    {
      id: 'EVT-002',
      title: 'Boiler servicing',
      type: 'job',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      startTime: '14:00',
      endTime: '16:00',
      client: 'Michael Brown',
      location: '456 Elm Avenue, Manchester',
      status: 'confirmed',
    },
    {
      id: 'EVT-003',
      title: 'Client consultation',
      type: 'appointment',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      startTime: '10:00',
      endTime: '11:00',
      client: 'Emma Wilson',
      location: 'Video Call',
      status: 'pending',
    },
    {
      id: 'EVT-004',
      title: 'Bathroom renovation',
      type: 'job',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      startTime: '09:00',
      endTime: '17:00',
      client: 'James Davis',
      location: '789 Pine Road, Birmingham',
      status: 'confirmed',
    },
    {
      id: 'EVT-005',
      title: 'Holiday',
      type: 'blocked',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
      startTime: '00:00',
      endTime: '23:59',
    },
  ];

  // Availability settings
  const [availability, setAvailability] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'job':
        return 'bg-teal-50 text-teal-700 border-l-4 border-teal-600';
      case 'appointment':
        return 'bg-blue-50 text-blue-700 border-l-4 border-blue-600';
      case 'blocked':
        return 'bg-gray-50 text-gray-700 border-l-4 border-gray-400';
      case 'available':
        return 'bg-white text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === day.getDate() &&
        event.date.getMonth() === day.getMonth() &&
        event.date.getFullYear() === day.getFullYear()
    );
  };

  const handleDragStart = (event: Event) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (day: Date) => {
    if (draggedEvent) {
      toast.success(`Event "${draggedEvent.title}" moved to ${day.toLocaleDateString()}`);
      setDraggedEvent(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleBlockTime = () => {
    toast.success('Time slot blocked');
  };

  const handleAddEvent = () => {
    toast.success('Event added to calendar');
  };

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Clean Header - Airbnb Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-1">
                Manage your schedule and availability
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBlockTime}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Block Time
              </button>
              <button
                onClick={handleAddEvent}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Availability
              </button>
            </div>
          </div>

          {/* Quick Stats - Clean Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                <p className="text-gray-600 text-sm font-medium">This Week</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">8 jobs</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-gray-600 text-sm font-medium">Available</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">12 slots</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-gray-600 text-sm font-medium">Hours Booked</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">32 hrs</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-gray-600 text-sm font-medium">Pending</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['month', 'week', 'day'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          view === v
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={previousMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid - Airbnb Style */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-gray-50 text-center font-medium text-gray-700 py-3 text-sm">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isCurrentDay = day && isToday(day);

                  return (
                    <div
                      key={index}
                      onDragOver={handleDragOver}
                      onDrop={() => day && handleDrop(day)}
                      onClick={() => day && setSelectedDate(day)}
                      className={`min-h-[100px] p-2 bg-white transition-all cursor-pointer ${
                        day
                          ? 'hover:bg-gray-50'
                          : 'bg-gray-50 cursor-default'
                      }`}
                    >
                      {day && (
                        <div>
                          <div className={`text-sm mb-2 flex items-center justify-center w-7 h-7 rounded-full mx-auto ${
                            isCurrentDay
                              ? 'bg-teal-600 text-white font-semibold'
                              : 'text-gray-900'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                draggable
                                onDragStart={() => handleDragStart(event)}
                                className={`px-2 py-1 rounded text-xs cursor-move ${getEventColor(event.type)}`}
                              >
                                <div className="font-medium truncate">{event.startTime}</div>
                                <div className="truncate">{event.title}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-teal-600 rounded"></div>
                  <span className="text-sm text-gray-600">Jobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-sm text-gray-600">Appointments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm text-gray-600">Blocked</span>
                </div>
              </div>
            </div>

            {/* Selected Date Events */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Select a date'}
              </h3>
              <div className="space-y-3">
                {selectedDate && getEventsForDay(selectedDate).length > 0 ? (
                  getEventsForDay(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {event.startTime} - {event.endTime}
                        </span>
                      </div>
                      {event.client && (
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <User className="w-4 h-4" />
                          <span>{event.client}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          {event.location.includes('Video') ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No events scheduled</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Availability Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {Object.entries(availability).map(([day, settings]) => (
                  <div key={day} className="pb-4 border-b border-gray-200 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-900 capitalize">{day}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enabled}
                          onChange={(e) =>
                            setAvailability({
                              ...availability,
                              [day]: { ...settings, enabled: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                    {settings.enabled && (
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="time"
                          value={settings.start}
                          onChange={(e) =>
                            setAvailability({
                              ...availability,
                              [day]: { ...settings, start: e.target.value },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={settings.end}
                          onChange={(e) =>
                            setAvailability({
                              ...availability,
                              [day]: { ...settings, end: e.target.value },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => toast.success('Availability settings saved!')}
                className="w-full mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Save Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
