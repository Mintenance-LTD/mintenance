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
  type: 'job' | 'meeting' | 'blocked' | 'available';
  startTime: string;
  endTime: string;
  client?: string;
  location?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

interface DayEvents {
  date: Date;
  events: Event[];
}

export default function ContractorCalendarPage2025() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Mock events data
  const events: Event[] = [
    {
      id: 'EVT-001',
      title: 'Kitchen sink replacement',
      type: 'job',
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
      startTime: '14:00',
      endTime: '16:00',
      client: 'Michael Brown',
      location: '456 Elm Avenue, Manchester',
      status: 'confirmed',
    },
    {
      id: 'EVT-003',
      title: 'Client consultation',
      type: 'meeting',
      startTime: '10:00',
      endTime: '11:00',
      client: 'Emma Wilson',
      location: 'Video Call',
      status: 'pending',
    },
    {
      id: 'EVT-004',
      title: 'Holiday',
      type: 'blocked',
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
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'meeting':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Calendar & Availability</h1>
              </div>
              <p className="text-emerald-100 text-lg">
                Manage your schedule and set your working hours
              </p>
            </div>

            <div className="flex gap-3">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBlockTime}
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Block Time
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddEvent}
                className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Event
              </MotionButton>
            </div>
          </div>

          {/* Quick Stats */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">This Week</p>
              </div>
              <p className="text-3xl font-bold">8 jobs</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-emerald-100 text-sm">Available</p>
              </div>
              <p className="text-3xl font-bold">12 slots</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Hours Booked</p>
              </div>
              <p className="text-3xl font-bold">32 hrs</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Pending</p>
              </div>
              <p className="text-3xl font-bold">3</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {(['month', 'week', 'day'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          view === v
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <MotionButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={previousMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={nextMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </MotionButton>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-700 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => (
                  <MotionDiv
                    key={index}
                    whileHover={day ? { scale: 1.05 } : {}}
                    onClick={() => day && setSelectedDate(day)}
                    className={`aspect-square p-2 rounded-lg border transition-all cursor-pointer ${
                      day
                        ? isToday(day)
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                        : 'bg-gray-50 border-transparent cursor-default'
                    }`}
                  >
                    {day && (
                      <div>
                        <div className="text-center mb-1">{day.getDate()}</div>
                        <div className="space-y-1">
                          {/* Event indicators (dots) */}
                          {index % 7 === 3 && (
                            <div className="flex justify-center gap-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </MotionDiv>
                ))}
              </div>
            </MotionDiv>

            {/* Today's Events */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Today's Schedule</h3>
              <div className="space-y-4">
                {events.slice(0, 2).map((event) => (
                  <MotionDiv
                    key={event.id}
                    whileHover={{ x: 4 }}
                    className={`border-l-4 pl-4 py-3 rounded-r-lg ${getEventColor(event.type).replace('bg-', 'border-').replace('-100', '-600')}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        {event.client && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <User className="w-4 h-4" />
                            <span>{event.client}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {event.startTime} - {event.endTime}
                          </span>
                        </div>
                        {event.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </MotionDiv>
          </div>

          {/* Availability Settings */}
          <div className="lg:col-span-1">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Availability</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {Object.entries(availability).map(([day, settings]) => (
                  <div key={day} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
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
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={settings.end}
                          onChange={(e) =>
                            setAvailability({
                              ...availability,
                              [day]: { ...settings, end: e.target.value },
                            })
                          }
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <MotionButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.success('Availability settings saved!')}
                className="w-full mt-6 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                Save Availability
              </MotionButton>
            </MotionDiv>
          </div>
        </div>
      </div>
    </div>
  );
}
