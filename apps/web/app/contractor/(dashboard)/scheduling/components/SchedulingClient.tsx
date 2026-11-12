'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { calendarDays, dateKey } from '@/lib/scheduling/calendar';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { StatsCards } from './Scheduling/StatsCards';
import { CalendarView } from './Scheduling/CalendarView';
import { UpcomingAppointments } from './Scheduling/UpcomingAppointments';
import { AvailabilitySettings } from './Scheduling/AvailabilitySettings';
import { NewAppointmentModal } from './Scheduling/NewAppointmentModal';
import {
  getCSRFToken,
  type Appointment,
  type AppointmentApiResponse,
  type Stats,
  type AvailabilitySlot,
  type NewAppointmentForm,
} from './Scheduling/types';

interface SchedulingClientProps {
  userId: string;
}

export function SchedulingClient(_props: SchedulingClientProps) {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('month');
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    upcomingAppointments: 0,
    completedThisWeek: 0,
    totalHours: 0,
    availableHours: 0,
  });
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const visibleDays = calendarDays(selectedDate, view);
  const rangeStart = dateKey(visibleDays[0]);
  const rangeEnd = dateKey(visibleDays[visibleDays.length - 1]);

  useEffect(() => {
    const controller = new AbortController();
    setCalendarLoading(true);
    setCalendarError(false);
    fetch('/api/contractor/appointments?' + new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Calendar unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setCalendarAppointments(data.appointments ?? []);
      })
      .catch(() => { if (!controller.signal.aborted) setCalendarError(true); })
      .finally(() => { if (!controller.signal.aborted) setCalendarLoading(false); });
    return () => controller.abort();
  }, [rangeStart, rangeEnd, calendarRefresh]);

  // Form state for new appointment
  const [newAppt, setNewAppt] = useState<NewAppointmentForm>({
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

  useEffect(() => {
    // Check if we should open the modal with pre-filled data from Messages
    const jobId = searchParams.get('jobId');
    const clientName = searchParams.get('clientName');
    const prefill = searchParams.get('prefill');

    if (prefill === 'true' && clientName) {
      setNewAppt((prev) => ({
        ...prev,
        clientName: clientName,
        title: jobId ? `Meeting for Job #${jobId}` : 'Project Discussion',
        notes: jobId ? `Related to Job #${jobId}` : '',
      }));
      setShowNewAppointmentModal(true);
    }
  }, [searchParams]);

  const loadAppointments = useCallback(async () => {
    try {
      const response = await fetch('/api/contractor/appointments?daysAhead=30');
      if (!response.ok) throw new Error('Failed to fetch appointments');

      const data = await response.json();
      const transformedAppointments: Appointment[] = (
        data.appointments || []
      ).map((apt: AppointmentApiResponse) => ({
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
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/contractor/appointments/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(prev => data.stats || prev);
    } catch (error) {
      logger.error('Error loading stats:', error, { service: 'ui' });
      throw error;
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/contractor/availability');
      if (!response.ok) throw new Error('Failed to fetch availability');

      const data = await response.json();

      // Merge with defaults to ensure all days are present
      const allDays = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const fullAvailability = allDays.map((day, dayOfWeek) => {
        const existing = data.availability?.find(
          (a: AvailabilitySlot) => a.dayOfWeek === dayOfWeek
        );
        return (
          existing || {
            day,
            dayOfWeek,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false,
          }
        );
      });

      setAvailability(fullAvailability);
    } catch (error) {
      logger.error('Error loading availability:', error, { service: 'ui' });
      throw error;
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadAppointments(), loadStats(), loadAvailability()]);
    } catch (error) {
      logger.error('Error loading data', error, { service: 'ui' });
      toast.error('Failed to load scheduling data');
    } finally { setLoading(false); }
  }, [loadAppointments, loadStats, loadAvailability]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleNewAppointment = () => {
    setShowNewAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    try {
      // Validate required fields
      if (
        !newAppt.title ||
        !newAppt.appointmentDate ||
        !newAppt.startTime ||
        !newAppt.endTime
      ) {
        toast.error('Please fill in all required fields');
        return;
      }

      // 2026-05-25 audit-43 P2: client-side guard mirroring the server
      // .refine(endTime > startTime). The DB duration trigger computes
      // EPOCH(end - start)/60 which goes negative if end <= start, and
      // the appointment list then renders nonsense durations.
      if (newAppt.endTime <= newAppt.startTime) {
        toast.error('End time must be after start time');
        return;
      }

      const response = await fetch('/api/contractor/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCSRFToken(),
        },
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
      setCalendarRefresh(value => value + 1);
    } catch (error: unknown) {
      logger.error('Error creating appointment:', error, { service: 'ui' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to create appointment'
      );
    }
  };

  const handleSaveAvailability = async () => {
    // 2026-05-25 audit-43 P2: every enabled day must have end > start.
    // Without this, the server happily stores nonsense slots which the
    // availability map / booking heuristics later misread as "available
    // all day" or "never available". Skip-checks are limited to
    // isAvailable=true rows so disabled days with their default
    // 09:00/17:00 placeholders don't trip the guard.
    const badSlot = availability.find(
      (s) => s.isAvailable && s.endTime <= s.startTime
    );
    if (badSlot) {
      toast.error(`${badSlot.day}: end time must be after start time`);
      return;
    }

    setSavingAvailability(true);
    try {
      const response = await fetch('/api/contractor/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCSRFToken(),
        },
        body: JSON.stringify({ availability }),
      });

      if (!response.ok) {
        throw new Error('Failed to save availability');
      }

      toast.success('Availability settings saved');
      await loadStats();
    } catch (error) {
      logger.error('Error saving availability:', error, { service: 'ui' });
      toast.error('Failed to save availability settings');
    } finally {
      setSavingAvailability(false);
    }
  };

  const updateAvailability = (
    dayOfWeek: number,
    field: string,
    value: unknown
  ) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
      )
    );
  };

  const today = new Date();
  const todayDate = dateKey(today);
  const nextWeek = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const upcomingAppointments = appointments.filter(apt => apt.date >= todayDate && apt.date < nextWeek && ['scheduled', 'confirmed'].includes(apt.status)).slice(0, 5);

  // Hydration-safe theme detection — hooks must run unconditionally
  // so this lives above the loading early-return.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (loading) {
    return (
      <ContractorPageWrapper>
        <div className='max-w-7xl mx-auto pb-12'>
          <div className='flex items-center justify-center h-64'>
            <div className='text-slate-600'>Loading schedule...</div>
          </div>
        </div>
      </ContractorPageWrapper>
    );
  }

  return (
    <ContractorPageWrapper>
      <div className='max-w-7xl mx-auto pb-12'>
        {/* Header — canonical .t-h1 + .btn-primary when Mint Editorial,
            legacy slate-900 hero otherwise. Stats cards, calendar grid,
            and availability sidebar inherit colour mapping from the
            shell-level .me-legacy-fit boundary. */}
        {isMintEditorial ? (
          <div
            className='between'
            style={{ alignItems: 'flex-start', marginBottom: 24 }}
          >
            <div className='col' style={{ gap: 4 }}>
              <h1 className='t-h1'>Calendar & scheduling</h1>
              <p className='t-body'>
                Book new appointments, manage your weekly availability, and keep
                track of upcoming meetings with homeowners.
              </p>
            </div>
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={handleNewAppointment}
            >
              <Plus size={14} strokeWidth={1.75} />
              New appointment
            </button>
          </div>
        ) : (
          <MotionDiv
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-8'
          >
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-bold text-slate-900 mb-2'>
                  Calendar & Scheduling
                </h1>
                <p className='text-slate-600'>
                  Manage your appointments and availability
                </p>
              </div>
              <MotionButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewAppointment}
                className='flex items-center gap-2 bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded-xl font-semibold text-white shadow-sm transition-all'
              >
                <Plus className='w-5 h-5' />
                New Appointment
              </MotionButton>
            </div>
          </MotionDiv>
        )}

        <StatsCards stats={stats} />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2'>
            {calendarError && <p role='alert'>Calendar could not be loaded. <button type='button' onClick={() => setCalendarRefresh(value => value + 1)}>Retry</button></p>}
            {calendarLoading && <p role='status'>Loading appointments…</p>}
            <CalendarView
              selectedDate={selectedDate}
              view={view}
              setView={setView}
              setSelectedDate={setSelectedDate}
              appointments={calendarError || calendarLoading ? [] : calendarAppointments}
            />
          </div>
          <div>
            <UpcomingAppointments upcomingAppointments={upcomingAppointments} />
          </div>
        </div>

        <AvailabilitySettings
          availability={availability}
          updateAvailability={updateAvailability}
          handleSaveAvailability={handleSaveAvailability}
          savingAvailability={savingAvailability}
        />

        {showNewAppointmentModal && (
          <NewAppointmentModal
            newAppt={newAppt}
            setNewAppt={setNewAppt}
            onClose={() => setShowNewAppointmentModal(false)}
            onSave={handleSaveAppointment}
          />
        )}
      </div>
    </ContractorPageWrapper>
  );
}
