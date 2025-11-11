import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';

/**
 * Track when a contractor views a job
 * POST /api/jobs/[id]/track-view
 */
export async function POST(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only contractors can track views
    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can track job views' },
        { status: 403 }
      );
    }

    // Verify job exists and get homeowner info
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if this contractor has already viewed this job
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('id')
      .eq('job_id', jobId)
      .eq('contractor_id', user.id)
      .single();

    const isFirstView = !existingView;

    // Insert or update view (upsert)
    const { error: viewError } = await serverSupabase
      .from('job_views')
      .upsert({
        job_id: jobId,
        contractor_id: user.id,
        viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'job_id,contractor_id',
      });

    if (viewError) {
      console.error('Error tracking job view:', viewError);
      return NextResponse.json(
        { error: 'Failed to track view' },
        { status: 500 }
      );
    }

    // Create notification for homeowner on first view only
    if (isFirstView && job.homeowner_id) {
      try {
        // Get contractor name
        const { data: contractor } = await serverSupabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const contractorName = contractor
          ? `${contractor.first_name} ${contractor.last_name}`
          : 'A contractor';

        const { error: notificationError } = await serverSupabase
          .from('notifications')
          .insert({
            user_id: job.homeowner_id,
            title: 'Job Viewed',
            message: `${contractorName} viewed your job "${job.title}"`,
            type: 'job_viewed',
            read: false,
            action_url: `/jobs/${jobId}`,
            created_at: new Date().toISOString(),
          });

        if (notificationError) {
          console.error('[Job View] Failed to create notification for homeowner', {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
            error: notificationError.message,
          });
        } else {
          console.log('[Job View] Notification created for homeowner', {
            service: 'jobs',
            homeownerId: job.homeowner_id,
            jobId,
            contractorId: user.id,
          });
        }
      } catch (notificationError) {
        console.error('[Job View] Unexpected error creating notification', {
          service: 'jobs',
          homeownerId: job.homeowner_id,
          jobId,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-view route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

