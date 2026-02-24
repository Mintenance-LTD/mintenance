import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getUserFromRequest } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError, ConflictError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

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
  locationType: z.enum(['onsite', 'remote', 'phone']).optional().or(emptyToUndefined),
  locationAddress: z.string().max(500).optional().or(emptyToUndefined),
  jobId: z.string().uuid().optional().or(emptyToUndefined),
  notes: z.string().max(5000).optional().or(emptyToUndefined),
});

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getUserFromRequest(request);

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const status = searchParams.get('status');

    // Build query
    let query = serverSupabase
      .from('appointments')
      .select(`
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
      `)
      .eq('contractor_id', user.id)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .lte('appointment_date', new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      logger.error('Error fetching appointments', error, { service: 'appointments', userId: user.id });
      throw error;
    }

    // Transform data to match client interface
    const transformedAppointments = appointments?.map((apt) => ({
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
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getUserFromRequest(request);

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

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
      logger.error('Error creating appointment', error, { service: 'appointments', userId: user.id });
      throw error;
    }

    // Notify homeowner if this appointment is linked to a job
    try {
      let homeownerId: string | null = null;
      let jobTitle: string | null = null;

      if (jobId) {
        const { data: job } = await serverSupabase
          .from('jobs')
          .select('homeowner_id, title')
          .eq('id', jobId)
          .single();
        homeownerId = job?.homeowner_id || null;
        jobTitle = job?.title || null;
      }

      // Get contractor name for the notification
      const { data: contractor } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single();
      const contractorName = contractor
        ? `${contractor.first_name} ${contractor.last_name}`.trim() || contractor.company_name || 'Your contractor'
        : 'Your contractor';

      const dateStr = new Date(appointmentDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
      const typeLabel = locationType === 'remote' ? 'video call' : locationType === 'phone' ? 'phone call' : 'on-site visit';

      if (homeownerId) {
        await NotificationService.createNotification({
          userId: homeownerId,
          type: 'appointment_scheduled',
          title: 'Appointment Scheduled',
          message: `${contractorName} scheduled a ${typeLabel}: "${title}" on ${dateStr} at ${startTime}`,
          metadata: { appointmentId: newAppointment.id, jobId, contractorId: user.id },
        });
      }
    } catch (notifErr) {
      // Don't fail the appointment creation if notification fails
      logger.error('Failed to send appointment notification', notifErr, { service: 'appointments' });
    }

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
