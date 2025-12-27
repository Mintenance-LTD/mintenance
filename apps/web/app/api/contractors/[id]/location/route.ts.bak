import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  job_id: z.string().uuid().optional(),
});

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id: contractorId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is the contractor or has permission
    if (user.id !== contractorId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to update this location' }, { status: 403 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can update location' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { latitude, longitude, accuracy, altitude, heading, speed, job_id } = parsed.data;

    // Verify contractor is sharing location for this job (if job_id provided)
    if (job_id) {
      const { data: locationCheck } = await serverSupabase
        .from('contractor_locations')
        .select('is_sharing_location')
        .eq('contractor_id', contractorId)
        .eq('job_id', job_id)
        .eq('is_active', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!locationCheck?.is_sharing_location) {
        return NextResponse.json({ error: 'Location sharing not enabled for this job' }, { status: 403 });
      }
    }

    // Insert new location record
    const { data: location, error: locationError } = await serverSupabase
      .from('contractor_locations')
      .insert({
        contractor_id: contractorId,
        job_id: job_id || null,
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        heading: heading || null,
        speed: speed || null,
        is_active: true,
        is_sharing_location: true,
        location_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (locationError) {
      logger.error('Error updating location', locationError, {
        service: 'contractor_locations',
        contractorId,
        job_id,
      });
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.location_timestamp,
      },
    });
  } catch (error) {
    logger.error('Unexpected error in POST location', error, {
      service: 'contractor_locations',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractorId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');

    // Verify user has permission to view this location
    // Homeowner can view if they have a job with this contractor
    // Contractor can view their own location
    let hasPermission = false;

    if (user.id === contractorId) {
      hasPermission = true;
    } else if (user.role === 'homeowner' && jobId) {
      // Verify homeowner has a job with this contractor
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, contractor_id')
        .eq('id', jobId)
        .eq('homeowner_id', user.id)
        .eq('contractor_id', contractorId)
        .single();

      hasPermission = !!job;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Not authorized to view this location' }, { status: 403 });
    }

    // Get latest location
    let query = serverSupabase
      .from('contractor_locations')
      .select('id, latitude, longitude, accuracy, location_timestamp, is_sharing_location')
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .eq('is_sharing_location', true)
      .order('location_timestamp', { ascending: false })
      .limit(1);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: locations, error } = await query;

    if (error) {
      logger.error('Error fetching location', error, {
        service: 'contractor_locations',
        contractorId,
        jobId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: 'Location not found or sharing not enabled' }, { status: 404 });
    }

    return NextResponse.json({
      location: locations[0],
    });
  } catch (error) {
    logger.error('Unexpected error in GET location', error, {
      service: 'contractor_locations',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

