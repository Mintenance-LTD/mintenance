import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, UnauthorizedError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';

const startTripSchema = z
  .object({
    jobId: z.string().uuid().optional(),
    appointmentId: z.string().uuid().optional(),
    tripType: z
      .enum(['job_visit', 'appointment', 'inspection'])
      .default('job_visit'),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.jobId || data.appointmentId, {
    message: 'Either jobId or appointmentId is required',
  });

/**
 * GET /api/contractor/trips
 * List contractor's trips filtered by status
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'en_route';
    // 2026-05-24 audit-32 P1: jobId filter lets mobile's arrival flow
    // resolve the contractor's active trip without pulling the full
    // list. Without this the mobile "Arrived" path had no way to find
    // the trip id to PATCH and the en_route row stayed open forever —
    // blocking any future trip start.
    const jobIdFilter = searchParams.get('jobId');

    let query = serverSupabase
      .from('contractor_trips')
      .select(
        `
        *,
        job:jobs!job_id(id, title, status, latitude, longitude, location),
        appointment:appointments!appointment_id(id, title, appointment_date, start_time, location_address)
      `
      )
      .eq('contractor_id', user.id)
      .eq('status', status);

    if (jobIdFilter) {
      query = query.eq('job_id', jobIdFilter);
    }

    const { data: trips, error } = await query
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Error fetching trips', error, { service: 'trips' });
      throw error;
    }

    return NextResponse.json({ trips: trips || [] });
  }
);

/**
 * POST /api/contractor/trips
 * Start a new trip to a job or appointment
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
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
        .select(
          'id, title, contractor_id, homeowner_id, latitude, longitude, location, status'
        )
        .eq('id', jobId)
        .single();

      if (!job) throw new BadRequestError('Job not found');
      if (job.contractor_id !== user.id)
        throw new UnauthorizedError('Not assigned to this job');
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
      if (appt.contractor_id !== user.id)
        throw new UnauthorizedError('Not your appointment');

      destinationAddress = appt.location_address;

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

    // 2026-05-27 audit-78 P1: stale-trip recovery. The active-trip guard
    // used to throw unconditionally on any open en_route row, which left
    // contractors permanently blocked whenever a previous trip's GPS
    // tick never landed (live evidence: 1 en_route trip 97 days old +
    // 0 active contractor_locations row in the same window). Now: if
    // the open trip has no active contractor_locations companion and
    // started more than STALE_TRIP_MINUTES ago, auto-cancel it and
    // continue creating the new trip. A fresh trip with a healthy
    // location row still blocks (the contractor genuinely is mid-ride).
    const STALE_TRIP_MINUTES = 10;
    const { data: existingTrip } = await serverSupabase
      .from('contractor_trips')
      .select('id, started_at, job_id')
      .eq('contractor_id', user.id)
      .eq('status', 'en_route')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTrip) {
      const startedAt = new Date(existingTrip.started_at);
      const ageMinutes = (Date.now() - startedAt.getTime()) / 60000;
      let hasLiveLocation = false;
      if (existingTrip.job_id) {
        const { data: liveLoc } = await serverSupabase
          .from('contractor_locations')
          .select('id')
          .eq('contractor_id', user.id)
          .eq('job_id', existingTrip.job_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        hasLiveLocation = !!liveLoc;
      } else {
        // No job_id on the trip — fall back to any active row for this
        // contractor (availability ping). If anything active exists in
        // the last 10 min we treat the trip as still alive.
        const { data: liveLoc } = await serverSupabase
          .from('contractor_locations')
          .select('id, location_timestamp')
          .eq('contractor_id', user.id)
          .eq('is_active', true)
          .order('location_timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (liveLoc) {
          const locAge =
            (Date.now() - new Date(liveLoc.location_timestamp).getTime()) /
            60000;
          hasLiveLocation = locAge < STALE_TRIP_MINUTES;
        }
      }

      if (hasLiveLocation || ageMinutes < STALE_TRIP_MINUTES) {
        throw new BadRequestError(
          'You already have an active trip. Complete or cancel it first.'
        );
      }

      // Stale → auto-cancel so the new trip can start cleanly.
      const { error: cancelErr } = await serverSupabase
        .from('contractor_trips')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          notes:
            'Auto-cancelled — stale en_route trip with no recent location ping.',
        })
        .eq('id', existingTrip.id)
        .eq('contractor_id', user.id);
      if (cancelErr) {
        logger.warn('Failed to auto-cancel stale trip; falling through', {
          service: 'trips',
          tripId: existingTrip.id,
          error: cancelErr.message,
        });
      } else {
        logger.info('Auto-cancelled stale en_route trip', {
          service: 'trips',
          tripId: existingTrip.id,
          ageMinutes,
        });
      }
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

    // 2026-05-24 audit-32 P1: previously upserted into contractor_locations
    // with no latitude/longitude (both NOT NULL on the live table —
    // verified via information_schema) AND onConflict: 'contractor_id'
    // (there is no unique constraint on contractor_id alone; only a
    // partial unique index on (contractor_id, job_id) WHERE is_active=
    // true). The upsert therefore silently failed for every trip, the
    // route returned 201 and notified the homeowner, but the location
    // row never landed — so homeowner tracking had no live ETA.
    //
    // The canonical writer for contractor_locations is
    // JobContextLocationService on mobile (it captures real lat/lng
    // before persisting). Here we only want to mark any pre-existing
    // active row as context='traveling'; if none exists, the next GPS
    // tick from the mobile service will create it with valid coords.
    if (jobId) {
      const { error: locUpdateErr } = await serverSupabase
        .from('contractor_locations')
        .update({
          context: 'traveling',
          is_active: true,
          is_sharing_location: true,
          location_timestamp: new Date().toISOString(),
        })
        .eq('contractor_id', user.id)
        .eq('job_id', jobId)
        .eq('is_active', true);
      if (locUpdateErr) {
        logger.warn(
          'Could not flip existing contractor_locations row to traveling',
          {
            service: 'trips',
            contractorId: user.id,
            jobId,
            error: locUpdateErr.message,
          }
        );
      }
    }

    // Get contractor name for notifications
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

    // Notify homeowner — Mint Editorial voice (2026-05-21).
    if (homeownerId) {
      await NotificationService.createNotification({
        userId: homeownerId,
        type: 'contractor_en_route',
        title: `${contractorName} is on the way`,
        message: jobTitle
          ? `Heading to ${jobTitle}. Tap to follow them in.`
          : `Tap to follow them in.`,
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
        await Promise.all(
          admins.map((admin) =>
            NotificationService.createNotification({
              userId: admin.id,
              type: 'contractor_en_route',
              title: `Trip started — ${contractorName}`,
              message: `Heading to ${jobTitle || 'an appointment'}${homeownerId ? '' : ' (no linked homeowner)'}`,
              metadata: {
                tripId: trip.id,
                jobId,
                contractorId: user.id,
                homeownerId,
              },
            })
          )
        );
      }
    } catch (adminErr) {
      logger.error('Failed to notify admins of trip', adminErr, {
        service: 'trips',
      });
    }

    return NextResponse.json({ trip }, { status: 201 });
  }
);
