import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

/**
 * Verify that a contractor may associate a business record with a job.
 *
 * Contractor-owned records use the service-role fallback in some mobile
 * requests, so relying on RLS alone is insufficient. Keep this check at the
 * API boundary for create and reassignment operations.
 */
export async function assertContractorJobAssignment(
  jobId: string,
  contractorId: string
): Promise<void> {
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select('id, contractor_id')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to verify contractor job assignment', error, {
      service: 'contractor-job-assignment',
      contractorId,
      jobId,
    });
    throw new InternalServerError('Could not verify the linked job');
  }

  if (!job) {
    throw new NotFoundError('Linked job not found');
  }

  if (job.contractor_id !== contractorId) {
    logger.warn('Contractor attempted to associate a record with another job', {
      service: 'contractor-job-assignment',
      contractorId,
      jobId,
    });
    throw new ForbiddenError(
      'You can only associate records with jobs assigned to you'
    );
  }
}
