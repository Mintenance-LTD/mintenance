import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

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
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can unsave jobs');
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
      throw new InternalServerError('Failed to unsave job');
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/contractor/saved-jobs/[jobId]', error, {
      service: 'saved_jobs',
    });
    throw new InternalServerError('Internal server error');
  }
}

