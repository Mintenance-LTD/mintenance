import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * Track when a contractor views a job
 * POST /api/jobs/[id]/track-view
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Verify job exists
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-view route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

