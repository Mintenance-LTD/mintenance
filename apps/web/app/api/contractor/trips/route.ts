import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

const startTripSchema = z.object({
  jobId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  tripType: z.enum(['job_visit', 'appointment', 'inspection']).default('job_visit'),
  notes: z.string().max(1000).optional(),
}).refine(data => data.jobId || data.appointmentId, {
  message: 'Either jobId or appointmentId is required',
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'en_route';

    const { data: trips, error } = await serverSupabase
      .from('contractor_trips')
      .select(`
        *,
        job:jobs!job_id(id, title, status, latitude, longitude, location),
        appointment:appointments!appointment_id(id, title, appointment_date, start_time, location_address)
      `)
      .eq('contractor_id', user.id)
      .eq('status', status)
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Error fetching trips', error, { service: 'trips' });
      throw error;
    }

    return NextResponse.json({ trips: trips || [] });
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

    const validation = await validateRequest(request, startTripSchema);
    if (validation instanceof NextResponse) return validation;
    const { jobId, appointmentId, tripType, notes } = validation.data;

    // Validate contractor is assigned to this job/appointment
    let homeownerId: string | null = null;
    let jobTitle: string | null = null;
    let destinationLat: number | null = null;
    let destinationLng: number | null = null;
    let destinationAddress: string | null = null;

    if (jobId) {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, title, contractor_id, homeowner_id, latitude, longitude, location, status')
        .eq('id', jobId)
        .single();

      if (!job) throw new BadRequestError('Job not found');
      if (job.contractor_id !== user.id) throw new UnauthorizedError('Not assigned to this job');
      if (!['assigned', 'in_progress'].includes(job.status)) {
        throw new BadRequestError('Job is not in an active state');
      }

      homeownerId = job.homeowner_id;
      jobTitle = job.title;
      destinationLat = job.latitude;
      destinationLng = job.longitude;
      destinationAddress = job.location;
    }

    if (appointmentId) {
      const { data: appt } = await serverSupabase
        .from('appointments')
        .select('id, title, contractor_id, job_id, location_address')
        .eq('id', appointmentId)
        .single();

      if (!appt) throw new BadRequestError('Appointment not found');
      if (appt.contractor_id !== user.id) throw new UnauthorizedError('Not your appointment');

      destinationAddress = appt.location_address;

      // If appointment is linked to a job, get homeowner from job
      if (appt.job_id && !jobId) {
        const { data: job } = await serverSupabase
          .from('jobs')
          .select('homeowner_id, title, latitude, longitude')
          .eq('id', appt.job_id)
          .single();
        if (job) {
          homeownerId = job.homeowner_id;
          jobTitle = job.title || appt.title;
          destinationLat = job.latitude;
          destinationLng = job.longitude;
        }
      }
    }

    // Check for existing active trip
    const { data: existingTrip } = await serverSupabase
      .from('contractor_trips')
      .select('id')
      .eq('contractor_id', user.id)
      .eq('status', 'en_route')
      .limit(1)
      .maybeSingle();

    if (existingTrip) {
      throw new BadRequestError('You already have an active trip. Complete or cancel it first.');
    }

    // Create the trip
    const { data: trip, error } = await serverSupabase
      .from('contractor_trips')
      .insert({
        contractor_id: user.id,
        job_id: jobId || null,
        appointment_id: appointmentId || null,
        trip_type: tripType,
        status: 'en_route',
        destination_address: destinationAddress,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        notes,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating trip', error, { service: 'trips' });
      throw error;
    }

    // Update contractor_locations context to 'traveling'
    await serverSupabase
      .from('contractor_locations')
      .upsert({
        contractor_id: user.id,
        job_id: jobId || null,
        context: 'traveling',
        is_active: true,
        is_sharing_location: true,
        location_timestamp: new Date().toISOString(),
      }, { onConflict: 'contractor_id' });

    // Get contractor name for notifications
    const { data: contractor } = await serverSupabase
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('id', user.id)
      .single();
    const contractorName = contractor
      ? `${contractor.first_name} ${contractor.last_name}`.trim() || contractor.company_name || 'Your contractor'
      : 'Your contractor';

    // Notify homeowner
    if (homeownerId) {
      await NotificationService.createNotification({
        userId: homeownerId,
        type: 'contractor_en_route',
        title: 'Contractor On The Way',
        message: `${contractorName} is heading to your property${jobTitle ? ` for "${jobTitle}"` : ''}. You'll be able to track their location.`,
        metadata: { tripId: trip.id, jobId, contractorId: user.id },
      });
    }

    // Notify all admins
    try {
      const { data: admins } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .is('deleted_at', null);

      if (admins && admins.length > 0) {
        await Promise.all(admins.map(admin =>
          NotificationService.createNotification({
            userId: admin.id,
            type: 'contractor_en_route',
            title: 'Contractor En Route',
            message: `${contractorName} is heading to ${jobTitle || 'an appointment'}${homeownerId ? '' : ' (no linked homeowner)'}`,
            metadata: { tripId: trip.id, jobId, contractorId: user.id, homeownerId },
          })
        ));
      }
    } catch (adminErr) {
      logger.error('Failed to notify admins of trip', adminErr, { service: 'trips' });
    }

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
