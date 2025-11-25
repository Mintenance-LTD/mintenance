import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

/**
 * Delete a saved job
 * DELETE /api/contractor/saved-jobs/[jobId]
 */
export async function DELETE(  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();
    const resolvedParams = await params;
    const jobId = resolvedParams.jobId;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can unsave jobs' }, { status: 403 });
    }

    // Delete the saved job
    const { error: deleteError } = await serverSupabase
      .from('saved_jobs')
      .delete()
      .eq('contractor_id', user.id)
      .eq('job_id', jobId);

    if (deleteError) {
      logger.error('Error unsaving job', deleteError, {
        service: 'saved_jobs',
        userId: user.id,
        jobId,
      });
      return NextResponse.json({ error: 'Failed to unsave job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/contractor/saved-jobs/[jobId]', error, {
      service: 'saved_jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

