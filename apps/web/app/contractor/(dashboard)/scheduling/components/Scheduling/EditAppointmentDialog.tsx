'use client';
import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { ukDateTimeToISO } from '@/lib/scheduling/uk-date-time';
import type { Appointment } from './types';

export function EditAppointmentDialog({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(appointment.date);
  const [start, setStart] = useState(appointment.time.slice(0, 5));
  const [end, setEnd] = useState(appointment.endTime?.slice(0, 5) ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const canEdit = ['scheduled', 'confirmed', 'rescheduled'].includes(
    appointment.status
  );
  async function save() {
    if (inFlight.current || !canEdit) return;
    setError('');
    try {
      ukDateTimeToISO(date + 'T' + start);
      ukDateTimeToISO(date + 'T' + end);
      if (end <= start) throw new Error('End time must be after start time.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Choose valid UK times.'
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const response = await fetchWithCsrf(
        '/api/contractor/appointments/' + encodeURIComponent(appointment.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentDate: date,
            startTime: start,
            endTime: end,
            status: 'rescheduled',
            ...(reason.trim() ? { rescheduleReason: reason.trim() } : {}),
            expected: {
              date: appointment.date,
              start: appointment.time,
              end: appointment.endTime,
            },
          }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.appointment?.id !== appointment.id)
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : (data?.error?.message ??
                'The visit could not be saved. Refresh before retrying.')
        );
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save visit.'
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>
          {canEdit ? 'Reschedule visit' : 'Visit details'}: {appointment.title}
        </DialogTitle>
        <DialogDescription>
          This changes this individual visit. It does not change the signed
          agreement or contractual job dates. All times below are UK time.
        </DialogDescription>
        <p>
          {appointment.client} · {appointment.status}
        </p>
        <form
          className='space-y-3'
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className='block'>
            Visit date
            <input
              aria-label='Visit date'
              type='date'
              required
              className='block w-full border rounded p-2'
              value={date}
              disabled={!canEdit || busy}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className='grid grid-cols-2 gap-3'>
            <label>
              Start (UK)
              <input
                aria-label='Start (UK)'
                className='block w-full border rounded p-2'
                type='time'
                required
                value={start}
                disabled={!canEdit || busy}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              End (UK)
              <input
                aria-label='End (UK)'
                className='block w-full border rounded p-2'
                type='time'
                required
                value={end}
                disabled={!canEdit || busy}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          {canEdit ? (
            <>
              <label className='block'>
                Reschedule note (optional)
                <textarea
                  className='block w-full border rounded p-2'
                  maxLength={5000}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <p>
                Any previous client confirmation will be reset. If this visit
                has a linked client account, a notification will be queued for
                the new time.
              </p>
              <button
                className='btn btn-primary'
                disabled={
                  busy ||
                  !appointment.endTime ||
                  (date === appointment.date &&
                    start === appointment.time.slice(0, 5) &&
                    end === appointment.endTime.slice(0, 5))
                }
                type='submit'
              >
                {busy ? 'Saving visit…' : 'Save new visit time'}
              </button>
            </>
          ) : (
            <p>
              This visit has already started or ended. Create a new appointment
              for another visit.
            </p>
          )}
          {error && <p role='alert'>{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
