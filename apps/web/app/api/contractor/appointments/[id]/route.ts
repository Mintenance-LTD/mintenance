import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ukDateTimeToISO } from '@/lib/scheduling/uk-date-time';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// 2026-05-27 audit-78 P1: per-appointment read + patch.
// The mobile MeetingCRUD module historically reached
// `/api/contractor/meetings/[id]` which writes/reads the legacy
// `contractor_meetings` table (live row count = 0). createMeeting
// was migrated to `/api/contractor/appointments` on 2026-05-26
// (audit-55) but the read paths (getMeetingById, status updates,
// reschedules) were left pointing at the dead endpoint. That left
// MeetingDetailsScreen unable to load any of the 9 live appointment
// rows. This route is the read-side companion to the collection
// route — same shape as the appointments POST returns so the mobile
// coercer maps cleanly.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const timeString = z
  .string()
  .min(1)
  .regex(TIME_RE, 'must be HH:MM or HH:MM:SS');

const patchSchema = z
  .object({
    status: z
      .enum([
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled',
      ])
      .optional(),
    appointmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    rescheduleReason: z.string().max(5000).optional(),
    expected: z
      .object({ date: z.string(), start: timeString, end: timeString })
      .strict()
      .optional(),
    notes: z.string().max(5000).optional(),
    cancellationReason: z.string().max(2000).optional(),
  })
  .strict()
  .refine(
    (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    }
  );

/**
 * GET /api/contractor/appointments/[id]
 * Returns a single appointment if the caller is the contractor on it
 * (admin override is allowed for support). Homeowners read the same
 * row via the role-agnostic /api/appointments list endpoint.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const { id } = params;

    const { data: apt, error } = await serverSupabase
      .from('appointments')
      .select(
        `
        *,
        client:profiles!client_id(
          id, first_name, last_name, email, phone, profile_image_url
        ),
        contractor:profiles!contractor_id(
          id, first_name, last_name, email, phone, profile_image_url
        ),
        job:jobs!job_id(id, title, status, latitude, longitude, location)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching appointment', error, {
        service: 'appointments',
        appointmentId: id,
      });
      throw new InternalServerError('Failed to fetch appointment');
    }
    if (!apt) {
      throw new NotFoundError('Appointment not found');
    }

    const isContractor = apt.contractor_id === user.id;
    const isClient =
      apt.client_id === user.id ||
      (user.email && apt.client_email === user.email);
    const isAdmin = user.role === 'admin';
    if (!isContractor && !isClient && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this appointment');
    }

    return NextResponse.json({ appointment: apt });
  }
);

/**
 * PATCH /api/contractor/appointments/[id]
 * Contractor-only mutate: status changes (in_progress, completed,
 * cancelled, rescheduled) and reschedule (date + start/end time).
 * The appointments duration trigger recomputes duration_minutes from
 * the new start/end times, so we just write the columns and let the
 * trigger fire.
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, patchSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    const { data: existing, error: lookupErr } = await serverSupabase
      .from('appointments')
      .select(
        'id, contractor_id, status, appointment_date, start_time, end_time'
      )
      .eq('id', id)
      .maybeSingle();
    if (lookupErr) {
      logger.error('Error loading appointment for patch', lookupErr, {
        service: 'appointments',
        appointmentId: id,
      });
      throw new InternalServerError('Failed to load appointment');
    }
    if (!existing) throw new NotFoundError('Appointment not found');
    if (existing.contractor_id !== user.id) {
      throw new ForbiddenError('Not authorized to update this appointment');
    }

    if (
      payload.appointmentDate !== undefined ||
      payload.startTime !== undefined ||
      payload.endTime !== undefined
    ) {
      if (!payload.expected)
        throw new BadRequestError('Reload the visit before changing its time.');
      const day = payload.appointmentDate ?? existing.appointment_date;
      const start = payload.startTime ?? existing.start_time;
      const end = payload.endTime ?? existing.end_time;
      try {
        ukDateTimeToISO(day + 'T' + start.slice(0, 5));
        ukDateTimeToISO(day + 'T' + end.slice(0, 5));
      } catch (error) {
        throw new BadRequestError(
          error instanceof Error
            ? error.message
            : 'Choose valid UK visit times.'
        );
      }
      if (end <= start)
        throw new BadRequestError('End time must be after start time.');
    }
    const mutation = await serverSupabase.rpc('update_contractor_appointment', {
      p_actor: user.id,
      p_id: id,
      p_changes: payload,
    });
    if (mutation.error?.code === '42501')
      throw new ForbiddenError('Appointment unavailable');
    if (['23P01', '40001'].includes(mutation.error?.code ?? ''))
      throw new ConflictError(
        'This visit changed or overlaps another appointment. Refresh and choose an available time.'
      );
    if (
      ['22023', '22007', '22008', '23514'].includes(mutation.error?.code ?? '')
    )
      throw new BadRequestError(
        'Choose valid dates and times for an upcoming visit. Completed or cancelled visits need a new appointment.'
      );
    if (mutation.error)
      throw new InternalServerError(
        'Unable to save the visit. Refresh before retrying.'
      );
    const { data: updated, error: updateErr } = await serverSupabase
      .from('appointments')
      .select(
        `
        *,
        client:profiles!client_id(
          id, first_name, last_name, email, phone, profile_image_url
        ),
        contractor:profiles!contractor_id(
          id, first_name, last_name, email, phone, profile_image_url
        ),
        job:jobs!job_id(id, title, status, latitude, longitude, location)
      `
      )
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();
    if (updateErr) {
      logger.error('Error updating appointment', updateErr, {
        service: 'appointments',
        appointmentId: id,
        userId: user.id,
      });
      throw new InternalServerError('Failed to update appointment');
    }

    return NextResponse.json({ appointment: updated });
  }
);
