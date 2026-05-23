import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Transform empty strings to undefined so optional validators work correctly
const emptyToUndefined = z.literal('').transform(() => undefined);

const createAppointmentSchema = z.object({
  title: z.string().min(1).max(500),
  clientName: z.string().max(200).optional().or(emptyToUndefined),
  clientEmail: z.string().email().optional().or(emptyToUndefined),
  clientPhone: z.string().max(50).optional().or(emptyToUndefined),
  appointmentDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  locationType: z
    .enum(['onsite', 'remote', 'phone'])
    .optional()
    .or(emptyToUndefined),
  locationAddress: z.string().max(500).optional().or(emptyToUndefined),
  jobId: z.string().uuid().optional().or(emptyToUndefined),
  notes: z.string().max(5000).optional().or(emptyToUndefined),
});

/**
 * GET /api/contractor/appointments
 * List contractor's upcoming appointments
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const status = searchParams.get('status');

    // Build query
    let query = serverSupabase
      .from('appointments')
      .select(
        `
        *,
        client:profiles!client_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          profile_image_url
        ),
        job:jobs!job_id(
          id,
          title,
          status,
          budget
        )
      `
      )
      .eq('contractor_id', user.id)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .lte(
        'appointment_date',
        new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      )
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      logger.error('Error fetching appointments', error, {
        service: 'appointments',
        userId: user.id,
      });
      throw error;
    }

    // Transform data to match client interface
    const transformedAppointments =
      appointments?.map((apt) => ({
        id: apt.id,
        title: apt.title,
        client: apt.client
          ? `${apt.client.first_name} ${apt.client.last_name}`
          : apt.client_name || 'Unknown Client',
        clientEmail: apt.client?.email || apt.client_email,
        clientPhone: apt.client?.phone || apt.client_phone,
        date: apt.appointment_date,
        time: apt.start_time,
        endTime: apt.end_time,
        duration: apt.duration_minutes ? `${apt.duration_minutes}m` : '60m',
        location: apt.location_address,
        type: apt.location_type,
        status: apt.status,
        jobTitle: apt.job?.title,
        jobId: apt.job?.id,
        notes: apt.notes,
        createdAt: apt.created_at,
      })) || [];

    return NextResponse.json({ appointments: transformedAppointments });
  }
);

/**
 * POST /api/contractor/appointments
 * Create a new appointment
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createAppointmentSchema);
    if (validation instanceof NextResponse) return validation;
    const {
      title,
      clientName,
      clientEmail,
      clientPhone,
      appointmentDate,
      startTime,
      endTime,
      locationType,
      locationAddress,
      jobId,
      notes,
    } = validation.data;

    // 2026-05-23 audit-20 P1: validate jobId belongs to this contractor
    // before linking the appointment. Previously the route accepted any
    // jobId and notified that job's homeowner, so a malicious contractor
    // could attach a calendar entry to someone else's job and spam the
    // unrelated homeowner with appointment notifications. Resolve the
    // homeowner_id here too so we can set the FK `client_id` — the
    // homeowner's appointments list (GET /api/appointments) filters on
    // client_id and was previously missing every contractor-created
    // appointment because that column was never populated.
    let resolvedClientId: string | null = null;
    let resolvedHomeownerId: string | null = null;
    let resolvedJobTitle: string | null = null;
    if (jobId) {
      const { data: job, error: jobLookupErr } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, contractor_id, title')
        .eq('id', jobId)
        .maybeSingle();
      if (jobLookupErr || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (job.contractor_id !== user.id && user.role !== 'admin') {
        logger.warn('Contractor appointment attached to foreign job', {
          service: 'appointments',
          userId: user.id,
          jobId,
          jobContractorId: job.contractor_id,
        });
        return NextResponse.json(
          {
            error:
              'You can only schedule appointments for jobs assigned to you',
          },
          { status: 403 }
        );
      }
      resolvedClientId = (job.homeowner_id as string | null) ?? null;
      resolvedHomeownerId = resolvedClientId;
      resolvedJobTitle = (job.title as string | null) ?? null;
    }

    // Check for conflicts
    const { data: conflictCheck } = await serverSupabase.rpc(
      'check_appointment_conflict',
      {
        contractor_uuid: user.id,
        appt_date: appointmentDate,
        appt_start_time: startTime,
        appt_end_time: endTime,
      }
    );

    if (conflictCheck) {
      throw new ConflictError('Time slot conflicts with existing appointment');
    }

    // Create appointment
    const { data: newAppointment, error } = await serverSupabase
      .from('appointments')
      .insert({
        contractor_id: user.id,
        title,
        client_id: resolvedClientId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        location_type: locationType || 'onsite',
        location_address: locationAddress,
        job_id: jobId || null,
        notes,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating appointment', error, {
        service: 'appointments',
        userId: user.id,
      });
      throw error;
    }

    // Notify homeowner if this appointment is linked to a job. Both
    // homeownerId and jobTitle were resolved during the ownership check
    // above — no need to re-query jobs.
    try {
      const homeownerId = resolvedHomeownerId;
      void resolvedJobTitle;

      // Get contractor name for the notification
      const { data: contractor } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single();
      const contractorName = contractor
        ? `${contractor.first_name} ${contractor.last_name}`.trim() ||
          contractor.company_name ||
          'Your contractor'
        : 'Your contractor';

      const dateStr = new Date(
        appointmentDate + 'T00:00:00'
      ).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const typeLabel =
        locationType === 'remote'
          ? 'video call'
          : locationType === 'phone'
            ? 'phone call'
            : 'on-site visit';

      if (homeownerId) {
        // 2026-05-21 Mint Editorial voice — lead with who + when, body
        // names the type so the homeowner knows whether to expect a call
        // or someone at the door.
        await NotificationService.createNotification({
          userId: homeownerId,
          type: 'appointment_scheduled',
          title: `${contractorName} booked you in for ${dateStr} at ${startTime}`,
          message: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} — ${title}.`,
          metadata: {
            appointmentId: newAppointment.id,
            jobId,
            contractorId: user.id,
          },
        });
      }
    } catch (notifErr) {
      // Don't fail the appointment creation if notification fails
      logger.error('Failed to send appointment notification', notifErr, {
        service: 'appointments',
      });
    }

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  }
);
