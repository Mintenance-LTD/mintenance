import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError, ConflictError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

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
        client:users!appointments_client_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          profile_image_url
        ),
        job:jobs(
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
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!title || !appointmentDate || !startTime || !endTime) {
      throw new BadRequestError('Missing required fields');
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

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
