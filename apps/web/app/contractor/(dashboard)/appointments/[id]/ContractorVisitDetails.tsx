'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  appointmentTime,
  appointmentAddress,
} from '@/lib/scheduling/appointment-display';
import { ukDateTimeToISO } from '@/lib/scheduling/uk-date-time';
import { EditAppointmentDialog } from '../../scheduling/components/Scheduling/EditAppointmentDialog';
import type { Appointment } from '../../scheduling/components/Scheduling/types';

interface Visit {
  id: string;
  title: string;
  status: Appointment['status'];
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  client_name?: string | null;
  client_response?:
    | 'pending'
    | 'confirmed'
    | 'declined'
    | 'change_requested'
    | null;
  client_response_at?: string | null;
  location_address?: string;
  location_type: Appointment['type'];
  job?: { id: string; title: string } | null;
  client?: { first_name?: string; last_name?: string } | null;
}

function visitIsPast(visit: Visit) {
  try {
    return (
      Date.parse(
        ukDateTimeToISO(
          `${visit.appointment_date}T${visit.end_time.slice(0, 5)}`
        )
      ) <= Date.now()
    );
  } catch {
    return true;
  }
}

export function ContractorVisitDetails({ id }: { id: string }) {
  const [rescheduling, setRescheduling] = useState(false);
  const {
    data: visit,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['contractor', 'appointment', id],
    queryFn: async ({ signal }): Promise<Visit> => {
      const response = await fetch(
        `/api/contractor/appointments/${encodeURIComponent(id)}`,
        { signal }
      );
      if (!response.ok) throw new Error('Visit unavailable');
      const result = await response.json();
      if (result.appointment?.id !== id) throw new Error('Visit unavailable');
      return result.appointment;
    },
    retry: false,
  });

  const date =
    visit &&
    new Date(`${visit.appointment_date}T12:00:00Z`).toLocaleDateString(
      'en-GB',
      {
        dateStyle: 'long',
        timeZone: 'Europe/London',
      }
    );
  const past = !!visit && visitIsPast(visit);
  const status =
    visit &&
    (visit.status === 'scheduled'
      ? visit.client_response === 'confirmed'
        ? 'Confirmed'
        : 'Proposed'
      : {
          confirmed: 'Confirmed',
          rescheduled: 'Rescheduled',
          cancelled: 'Cancelled',
          completed: 'Completed',
          in_progress: 'In progress',
        }[visit.status]);
  const client =
    visit &&
    ([visit.client?.first_name, visit.client?.last_name]
      .filter(Boolean)
      .join(' ') ||
      visit.client_name ||
      '');
  const canReschedule =
    visit &&
    !past &&
    ['scheduled', 'confirmed', 'rescheduled'].includes(visit.status);
  const newVisit = new URLSearchParams({
    prefill: 'true',
    clientName: client ?? '',
    ...(visit?.job && { jobId: visit.job.id, title: visit.job.title }),
  });

  return (
    <div className='mx-auto max-w-3xl space-y-5 p-6'>
      <Link href='/contractor/scheduling' className='font-medium underline'>
        Back to scheduling
      </Link>
      <section className='card card-pad rounded-xl border border-slate-200 p-6'>
        <h1 className='text-2xl font-semibold'>
          {visit?.title ?? 'Visit details'}
        </h1>
        {isPending && <p role='status'>Loading visit…</p>}
        {isError && (
          <p role='alert'>
            This visit is unavailable.{' '}
            <button
              type='button'
              className='underline'
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </p>
        )}
        {visit && (
          <div className='mt-4 space-y-3'>
            <p className='font-semibold'>
              {date} · {appointmentTime(visit.start_time, visit.end_time)} UK
              time
            </p>
            <p>
              {status ?? 'Status unavailable'}
              {past && ' · Past visit'}
            </p>
            {visit.client_response === 'confirmed' &&
              (visit.status === 'rescheduled' ||
                !!visit.client_response_at) && (
                <p>
                  {client || 'The client'} confirmed
                  {visit.client_response_at
                    ? ` on ${new Date(visit.client_response_at).toLocaleDateString('en-GB', { timeZone: 'Europe/London', dateStyle: 'long' })}`
                    : ''}
                  .
                </p>
              )}
            {visit.client_response === 'pending' &&
              ['scheduled', 'rescheduled'].includes(visit.status) && (
                <p>Awaiting client confirmation.</p>
              )}
            {visit.client_response === 'declined' && (
              <p>The client declined this slot.</p>
            )}
            {visit.client_response === 'change_requested' && (
              <p>The client requested another time.</p>
            )}
            {visit.location_address && (
              <p>{appointmentAddress(visit.location_address)}</p>
            )}
            <div className='flex flex-wrap gap-4'>
              {visit.job && (
                <Link
                  className='font-semibold underline'
                  href={`/contractor/jobs/${visit.job.id}`}
                >
                  View job
                </Link>
              )}
              {canReschedule ? (
                <button
                  type='button'
                  className='font-semibold underline'
                  onClick={() => setRescheduling(true)}
                >
                  Reschedule visit
                </button>
              ) : (
                (past || visit.status === 'cancelled') && (
                  <Link
                    className='font-semibold underline'
                    href={`/contractor/scheduling?${newVisit}`}
                  >
                    Propose a new visit
                  </Link>
                )
              )}
            </div>
            {rescheduling && canReschedule && (
              <EditAppointmentDialog
                appointment={{
                  id: visit.id,
                  title: visit.title,
                  client: client ?? '',
                  date: visit.appointment_date,
                  time: visit.start_time,
                  endTime: visit.end_time,
                  duration: `${visit.duration_minutes}m`,
                  type: visit.location_type,
                  status: visit.status,
                }}
                onClose={() => setRescheduling(false)}
                onSaved={() => {
                  setRescheduling(false);
                  void refetch();
                }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
