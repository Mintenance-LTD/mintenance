'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, Users, MapPin, Video, Plus, ChevronLeft, ChevronRight, Phone, Check, X } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

interface SchedulingClientProps {
  userId: string;
}

interface Appointment {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  location?: string;
  type: 'onsite' | 'video' | 'phone';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  jobTitle?: string;
}

interface Stats {
  upcomingAppointments: number;
  completedThisWeek: number;
  totalHours: number;
  availableSlots: number;
  weekOverWeekChange?: number;
}

interface AvailabilitySlot {
  id?: string;
  day: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function SchedulingClient({ userId }: SchedulingClientProps) {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('month');
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    upcomingAppointments: 0,
    completedThisWeek: 0,
    totalHours: 0,
    availableSlots: 0,
  });
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Form state for new appointment
  const [newAppt, setNewAppt] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    appointmentDate: '',
    startTime: '09:00',
    endTime: '10:00',
    locationType: 'onsite' as 'onsite' | 'video' | 'phone',
    locationAddress: '',
    notes: '',
  });

  useEffect(() => {
    loadData();

    // Check if we should open the modal with pre-filled data from Messages
    const jobId = searchParams.get('jobId');
    const clientName = searchParams.get('clientName');
    const prefill = searchParams.get('prefill');

    if (prefill === 'true' && clientName) {
      setNewAppt(prev => ({
        ...prev,
        clientName: clientName,
        title: jobId ? `Meeting for Job #${jobId}` : 'Project Discussion',
        notes: jobId ? `Related to Job #${jobId}` : '',
      }));
      setShowNewAppointmentModal(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAppointments(),
        loadStats(),
        loadAvailability(),
      ]);
    } catch (error) {
      logger.error('Error loading data', error, { service: 'ui' });
      toast.error('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/contractor/appointments?daysAhead=30');
      if (!response.ok) throw new Error('Failed to fetch appointments');

      const data = await response.json();
      const transformedAppointments: Appointment[] = (data.appointments || []).map((apt: unknown) => ({
        id: apt.id,
        title: apt.title,
        client: apt.client,
        date: apt.date,
        time: apt.time?.substring(0, 5) || '09:00', // Format HH:MM
        duration: apt.duration || '60m',
        location: apt.location,
        type: apt.type || 'onsite',
        status: apt.status || 'scheduled',
        jobTitle: apt.jobTitle,
      }));

      setAppointments(transformedAppointments);
    } catch (error) {
      logger.error('Error loading appointments:', error, { service: 'ui' });
      throw error;
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/contractor/appointments/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      logger.error('Error loading stats:', error, { service: 'ui' });
      throw error;
    }
  };

  const loadAvailability = async () => {
    try {
      const response = await fetch('/api/contractor/availability');
      if (!response.ok) {
        // If no availability set, use defaults
        const defaultAvailability = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({
          day,
          dayOfWeek: (index + 1) % 7, // Monday = 1, Sunday = 0
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: index < 5, // Monday-Friday enabled by default
        }));
        setAvailability(defaultAvailability);
        return;
      }

      const data = await response.json();

      // Merge with defaults to ensure all days are present
      const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const fullAvailability = allDays.map((day, dayOfWeek) => {
        const existing = data.availability?.find((a: AvailabilitySlot) => a.dayOfWeek === dayOfWeek);
        return existing || {
          day,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: false,
        };
      });

      setAvailability(fullAvailability);
    } catch (error) {
      logger.error('Error loading availability:', error, { service: 'ui' });
      throw error;
    }
  };

  const getTypeIcon = (type: Appointment['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'onsite':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'onsite':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const handleNewAppointment = () => {
    setShowNewAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    try {
      // Validate required fields
      if (!newAppt.title || !newAppt.appointmentDate || !newAppt.startTime || !newAppt.endTime) {
        toast.error('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/contractor/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppt),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create appointment');
      }

      toast.success('Appointment created successfully');
      setShowNewAppointmentModal(false);

      // Reset form
      setNewAppt({
        title: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        appointmentDate: '',
        startTime: '09:00',
        endTime: '10:00',
        locationType: 'onsite',
        locationAddress: '',
        notes: '',
      });

      // Reload data
      await loadData();
    } catch (error: unknown) {
      logger.error('Error creating appointment:', error, { service: 'ui' });
      toast.error(error.message || 'Failed to create appointment');
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const response = await fetch('/api/contractor/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });

      if (!response.ok) {
        throw new Error('Failed to save availability');
      }

      toast.success('Availability settings saved');
    } catch (error) {
      logger.error('Error saving availability:', error, { service: 'ui' });
      toast.error('Failed to save availability settings');
    } finally {
      setSavingAvailability(false);
    }
  };

  const updateAvailability = (dayOfWeek: number, field: string, value: unknown) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
      )
    );
  };

  // Get appointments for display (next 7 days)
  const upcomingAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return aptDate >= today && aptDate <= weekFromNow && apt.status !== 'cancelled';
    })
    .slice(0, 5); // Show top 5

  if (loading) {
    return (
      <ContractorPageWrapper>
        <div className="max-w-7xl mx-auto pb-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600">Loading schedule...</div>
          </div>
        </div>
      </ContractorPageWrapper>
    );
  }

  return (
    <ContractorPageWrapper>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Professional Header */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendar & Scheduling</h1>
              <p className="text-slate-600">Manage your appointments and availability</p>
            </div>
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewAppointment}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded-xl font-semibold text-white shadow-sm transition-all"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </MotionButton>
          </div>
        </MotionDiv>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-teal-100 rounded-xl">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Upcoming</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.upcomingAppointments}</p>
            <p className="text-xs text-slate-500 mt-1">Next 7 days</p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Completed</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.completedThisWeek}</p>
            <p className={`text-xs mt-1 ${stats.weekOverWeekChange && stats.weekOverWeekChange > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {stats.weekOverWeekChange ? `${stats.weekOverWeekChange > 0 ? '+' : ''}${stats.weekOverWeekChange}% vs last week` : 'This week'}
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Total Hours</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalHours}</p>
            <p className="text-xs text-slate-500 mt-1">This week</p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Available Slots</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.availableSlots}</p>
            <p className="text-xs text-slate-500 mt-1">Next 7 days</p>
          </MotionDiv>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2">
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
          </div>

          {/* Upcoming Appointments */}
          <div>
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Upcoming</h3>
                <span className="text-sm text-slate-600 font-medium">{upcomingAppointments.length} appointments</span>
              </div>

              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No upcoming appointments</p>
                  </div>
                ) : (
                  upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight flex-1 pr-2">{appointment.title}</h4>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getTypeColor(appointment.type)}`}>
                          {getTypeIcon(appointment.type)}
                          <span className="capitalize">{appointment.type}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-3 font-medium">{appointment.client}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(appointment.date).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {appointment.time} ({appointment.duration})
                        </div>
                      </div>
                      {appointment.location && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{appointment.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </MotionDiv>
          </div>
        </div>

        {/* Availability Settings */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-slate-200 p-8 mt-8 shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-2">Availability Settings</h2>
          <p className="text-sm text-slate-600 mb-8">Set your working hours and availability for each day</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availability.map((slot) => (
              <div key={slot.day} className="p-5 rounded-xl border border-slate-200 hover:border-teal-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">{slot.day}</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={slot.isAvailable}
                      onChange={(e) => updateAvailability(slot.dayOfWeek, 'isAvailable', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 shadow-sm"></div>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateAvailability(slot.dayOfWeek, 'startTime', e.target.value)}
                    disabled={!slot.isAvailable}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateAvailability(slot.dayOfWeek, 'endTime', e.target.value)}
                    disabled={!slot.isAvailable}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAvailability ? 'Saving...' : 'Save Changes'}
            </MotionButton>
          </div>
        </MotionDiv>

        {/* New Appointment Modal */}
        {showNewAppointmentModal && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowNewAppointmentModal(false)}
          >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">New Appointment</h3>
                  <button
                    onClick={() => setShowNewAppointmentModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-600" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Title *</label>
                    <input
                      type="text"
                      placeholder="e.g., Kitchen Consultation"
                      value={newAppt.title}
                      onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Date *</label>
                      <input
                        type="date"
                        value={newAppt.appointmentDate}
                        onChange={(e) => setNewAppt({ ...newAppt, appointmentDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Start Time *</label>
                      <input
                        type="time"
                        value={newAppt.startTime}
                        onChange={(e) => setNewAppt({ ...newAppt, startTime: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">End Time *</label>
                    <input
                      type="time"
                      value={newAppt.endTime}
                      onChange={(e) => setNewAppt({ ...newAppt, endTime: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Client Name</label>
                    <input
                      type="text"
                      placeholder="Client name"
                      value={newAppt.clientName}
                      onChange={(e) => setNewAppt({ ...newAppt, clientName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Appointment Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { type: 'onsite' as const, label: 'On-site', icon: MapPin },
                        { type: 'video' as const, label: 'Video Call', icon: Video },
                        { type: 'phone' as const, label: 'Phone Call', icon: Phone },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.type}
                            onClick={() => setNewAppt({ ...newAppt, locationType: option.type })}
                            className={`p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
                              newAppt.locationType === option.type
                                ? 'border-teal-600 bg-teal-50'
                                : 'border-slate-200 hover:border-teal-600 hover:bg-teal-50'
                            }`}
                          >
                            <Icon className="w-6 h-6 text-slate-600" />
                            <span className="text-sm font-medium text-slate-900">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="Enter address for on-site appointments"
                      value={newAppt.locationAddress}
                      onChange={(e) => setNewAppt({ ...newAppt, locationAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Additional notes or instructions..."
                      value={newAppt.notes}
                      onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveAppointment}
                      className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
                    >
                      Create Appointment
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowNewAppointmentModal(false)}
                      className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </MotionButton>
                  </div>
                </div>
              </div>
            </MotionDiv>
          </div>
        )}
      </div>
    </ContractorPageWrapper>
  );
}
