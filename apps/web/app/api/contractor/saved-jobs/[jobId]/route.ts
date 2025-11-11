import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';

/**
 * Delete a saved job
 * DELETE /api/contractor/saved-jobs/[jobId]
 */
export async function DELETE(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: Promise<{ jobId: string }> }
) {
  try {
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
      console.error('Error unsaving job:', deleteError);
      return NextResponse.json({ error: 'Failed to unsave job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/contractor/saved-jobs/[jobId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

