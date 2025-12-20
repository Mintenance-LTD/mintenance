import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id: jobId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can enable location sharing' }, { status: 403 });
    }

    const body = await request.json();
    const enabled = body.enabled !== false; // Default to true if not specified

    // Verify job exists and contractor is assigned
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to enable location sharing for this job' }, { status: 403 });
    }

    // Update or create location sharing record
    // Deactivate all previous locations for this job
    if (!enabled) {
      await serverSupabase
        .from('contractor_locations')
        .update({ is_sharing_location: false, is_active: false })
        .eq('contractor_id', user.id)
        .eq('job_id', jobId);
    } else {
      // Create a new location sharing record (actual location will be updated via POST /api/contractors/[id]/location)
      // For now, we'll just mark that sharing is enabled
      // The actual location updates will come from the contractor's device
    }

    // Create notification for homeowner
    if (enabled) {
      try {
        await serverSupabase
          .from('notifications')
          .insert({
            user_id: job.homeowner_id,
            title: 'Location Sharing Enabled 📍',
            message: `Contractor has enabled location sharing for "${job.title || 'the job'}". You can now track their location.`,
            type: 'location_sharing_enabled',
            read: false,
            action_url: `/jobs/${jobId}`,
            created_at: new Date().toISOString(),
          });
      } catch (notificationError) {
        logger.error('Failed to create notification', notificationError, {
          service: 'jobs',
          jobId,
          contractorId: user.id,
          homeownerId: job.homeowner_id,
        });
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled 
        ? 'Location sharing enabled. Start updating your location to allow tracking.' 
        : 'Location sharing disabled.',
    });
  } catch (error) {
    logger.error('Unexpected error in enable location sharing', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

