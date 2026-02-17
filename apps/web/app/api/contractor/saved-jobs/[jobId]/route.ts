import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';

/**
 * Delete a saved job
 * DELETE /api/contractor/saved-jobs/[jobId]
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const jobId = params.jobId;

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
  }
);
