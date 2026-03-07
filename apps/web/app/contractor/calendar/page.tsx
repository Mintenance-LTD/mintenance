'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Briefcase,
  MapPin,
  User,
  Video,
  Loader2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'job' | 'appointment';
  date: string;
  startTime: string;
  endTime: string;
  client?: string;
  location?: string;
  status?: string;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export default function ContractorCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    sunday: { enabled: false, start: '09:00', end: '13:00' },
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
  });

  // Fetch assigned jobs as calendar events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/jobs?status=assigned,in_progress', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const jobs = data.jobs || [];

      const jobEvents: CalendarEvent[] = jobs.map((job: Record<string, unknown>) => ({
        id: job.id as string,
        title: (job.title as string) || 'Untitled Job',
        type: 'job' as const,
        date: (job.scheduled_date as string) || (job.created_at as string) || new Date().toISOString(),
        startTime: (job.scheduled_time as string) || '09:00',
        endTime: '17:00',
        client: job.homeowner_name as string || '',
        location: job.location as string || '',
        status: job.status as string,
      }));

      // Also fetch appointments
      let appointments: CalendarEvent[] = [];
      const appointRes = await fetch('/api/appointments', { credentials: 'include' });
      if (appointRes.ok) {
        const appointData = await appointRes.json();
        appointments = (appointData.appointments || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: (a.title as string) || 'Appointment',
          type: 'appointment' as const,
          date: a.scheduled_at as string || a.date as string || new Date().toISOString(),
          startTime: a.start_time as string || '10:00',
          endTime: a.end_time as string || '11:00',
          client: a.client_name as string || '',
          location: a.location as string || '',
          status: a.status as string,
        }));
      }

      // Fetch signed contracts with start/end dates
      let contractEvents: CalendarEvent[] = [];
      const contractRes = await fetch('/api/contracts?status=accepted', { credentials: 'include' });
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        const contracts = contractData.contracts || [];
        contractEvents = contracts.flatMap((c: Record<string, unknown>) => {
          const events: CalendarEvent[] = [];
          if (c.start_date) {
            events.push({
              id: `contract-start-${c.id}`,
              title: `${(c.title as string) || 'Contract'} — Start`,
              type: 'job' as const,
              date: c.start_date as string,
              startTime: '09:00',
              endTime: '17:00',
              status: 'contract_start',
            });
          }
          if (c.end_date) {
            events.push({
              id: `contract-end-${c.id}`,
              title: `${(c.title as string) || 'Contract'} — Due`,
              type: 'job' as const,
              date: c.end_date as string,
              startTime: '09:00',
              endTime: '17:00',
              status: 'contract_end',
            });
          }
          return events;
        });
      }

      setEvents([...jobEvents, ...appointments, ...contractEvents]);
    } catch (error) {
      logger.error('Error fetching calendar events:', error, { service: 'app' });
    }
  }, []);

  // Fetch saved availability
  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/availability', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const slots: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[] = data.availability || [];

      if (slots.length > 0) {
        const newAvailability: Record<string, { enabled: boolean; start: string; end: string }> = {};
        DAY_NAMES.forEach((day, idx) => {
          const slot = slots.find((s) => s.dayOfWeek === idx);
          newAvailability[day] = slot
            ? { enabled: slot.isAvailable, start: slot.startTime, end: slot.endTime }
            : { enabled: false, start: '09:00', end: '17:00' };
        });
        setAvailability(newAvailability);
      }
    } catch (error) {
      logger.error('Error fetching availability:', error, { service: 'app' });
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchAvailability()]);
      setLoading(false);
    };
    load();
  }, [fetchEvents, fetchAvailability]);

  // Save availability to API
  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const slots: AvailabilitySlot[] = DAY_NAMES.map((day, idx) => ({
        dayOfWeek: idx,
        startTime: availability[day].start,
        endTime: availability[day].end,
        isAvailable: availability[day].enabled,
      }));

      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ availability: slots }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Availability saved');
    } catch (error) {
      toast.error('Failed to save availability');
    } finally {
      setSavingAvailability(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'job': return 'bg-teal-50 text-teal-700 border-l-4 border-teal-600';
      case 'appointment': return 'bg-blue-50 text-blue-700 border-l-4 border-blue-600';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear();
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': case 'assigned': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Stats from real data
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
  const thisWeekJobs = events.filter((e) => {
    const d = new Date(e.date);
    return d >= thisWeekStart && d < thisWeekEnd && e.type === 'job';
  }).length;
  const pendingEvents = events.filter((e) => e.status === 'pending' || e.status === 'assigned').length;
  const availableSlots = Object.values(availability).filter((s) => s.enabled).length;

  if (loading) {
    return (
      <div className="min-h-0 bg-gray-50 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-1">Manage your schedule and availability</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                <p className="text-gray-600 text-sm font-medium">This Week</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{thisWeekJobs} job{thisWeekJobs !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-gray-600 text-sm font-medium">Available Days</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{availableSlots}/7</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <p className="text-gray-600 text-sm font-medium">Total Events</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-gray-600 text-sm font-medium">Pending</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{pendingEvents}</p>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['month', 'week', 'day'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-gray-50 text-center font-medium text-gray-700 py-3 text-sm">{day}</div>
                ))}
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isCurrentDay = day && isToday(day);
                  return (
                    <div
                      key={index}
                      onClick={() => day && setSelectedDate(day)}
                      className={`min-h-[100px] p-2 bg-white transition-all cursor-pointer ${
                        day ? 'hover:bg-gray-50' : 'bg-gray-50 cursor-default'
                      }`}
                    >
                      {day && (
                        <div>
                          <div className={`text-sm mb-2 flex items-center justify-center w-7 h-7 rounded-full mx-auto ${
                            isCurrentDay ? 'bg-teal-600 text-white font-semibold' : 'text-gray-900'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className={`px-2 py-1 rounded text-xs ${getEventColor(event.type)}`}>
                                <div className="font-medium truncate">{event.startTime}</div>
                                <div className="truncate">{event.title}</div>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{dayEvents.length - 2} more</div>
                            )}
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
                  <div className="w-4 h-4 bg-teal-600 rounded" />
                  <span className="text-sm text-gray-600">Jobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded" />
                  <span className="text-sm text-gray-600">Appointments</span>
                </div>
              </div>
            </div>

            {/* Selected Date Events */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Select a date'}
              </h3>
              <div className="space-y-3">
                {selectedDate && getEventsForDay(selectedDate).length > 0 ? (
                  getEventsForDay(selectedDate).map((event) => (
                    <div key={event.id} className={`p-4 rounded-lg ${getEventColor(event.type)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{event.startTime} - {event.endTime}</span>
                      </div>
                      {event.client && (
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <User className="w-4 h-4" />
                          <span>{event.client}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          {event.location.toLowerCase().includes('video') ? (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Availability</h3>

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
                            setAvailability({ ...availability, [day]: { ...settings, enabled: e.target.checked } })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                      </label>
                    </div>
                    {settings.enabled && (
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="time"
                          value={settings.start}
                          onChange={(e) =>
                            setAvailability({ ...availability, [day]: { ...settings, start: e.target.value } })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={settings.end}
                          onChange={(e) =>
                            setAvailability({ ...availability, [day]: { ...settings, end: e.target.value } })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
                className="w-full mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
