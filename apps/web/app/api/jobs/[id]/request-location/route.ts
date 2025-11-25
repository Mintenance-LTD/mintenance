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

    if (user.role !== 'homeowner') {
      return NextResponse.json({ error: 'Only homeowners can request location sharing' }, { status: 403 });
    }

    // Verify job exists and belongs to homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to request location for this job' }, { status: 403 });
    }

    if (!job.contractor_id) {
      return NextResponse.json({ error: 'No contractor assigned to this job' }, { status: 400 });
    }

    if (job.status !== 'assigned' && job.status !== 'in_progress') {
      return NextResponse.json({ error: 'Job must be assigned or in progress to request location' }, { status: 400 });
    }

    // Create notification for contractor
    const { error: notificationError } = await serverSupabase
      .from('notifications')
      .insert({
        user_id: job.contractor_id,
        title: 'Location Sharing Request 📍',
        message: `Homeowner has requested to track your location for "${job.title || 'the job'}". Enable location sharing to allow tracking.`,
        type: 'location_sharing_request',
        read: false,
        action_url: `/contractor/jobs/${jobId}`,
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      logger.error('Error creating location request notification', notificationError, {
        service: 'jobs',
        jobId,
        homeownerId: user.id,
        contractorId: job.contractor_id,
      });
      return NextResponse.json({ error: 'Failed to send location request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location sharing request sent to contractor',
      status: 'pending',
    });
  } catch (error) {
    logger.error('Unexpected error in request location', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

