'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
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
      const transformedAppointments: Appointment[] = (data.appointments || []).map((apt: AppointmentApiResponse) => ({
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
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCSRFToken() },
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
      toast.error(error instanceof Error ? error.message : 'Failed to create appointment');
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const response = await fetch('/api/contractor/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCSRFToken() },
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

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CalendarView
              selectedDate={selectedDate}
              view={view}
              setView={setView}
              appointments={appointments}
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
