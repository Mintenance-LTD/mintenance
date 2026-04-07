/**
 * Centralized ownership validation utilities for job-related entities.
 * Prevents IDOR vulnerabilities by verifying user ownership at the API layer.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

interface JobOwnershipResult {
  id: string;
  homeowner_id: string;
  contractor_id: string | null;
  status: string;
  title: string | null;
}

/**
 * Verifies that the given user owns the job in the specified role.
 * Throws NotFoundError if the job doesn't exist, ForbiddenError if the user isn't the owner.
 *
 * @returns The job record for further use in the handler.
 */
export async function requireJobOwnership(
  jobId: string,
  userId: string,
  role: 'homeowner' | 'contractor',
  additionalSelect?: string
): Promise<JobOwnershipResult & Record<string, unknown>> {
  const selectFields = `id, homeowner_id, contractor_id, status, title${additionalSelect ? `, ${additionalSelect}` : ''}`;

  const { data, error } = await serverSupabase
    .from('jobs')
    .select(selectFields)
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Job not found');
  }

  const job = data as unknown as JobOwnershipResult & Record<string, unknown>;

  const ownerId = role === 'homeowner' ? job.homeowner_id : job.contractor_id;
  if (ownerId !== userId) {
    throw new ForbiddenError(
      `Only the assigned ${role} can perform this action`
    );
  }

  return job;
}

/**
 * Verifies that the user is either the homeowner or contractor on the job.
 * Returns the job and the user's role on it.
 */
export async function requireJobParticipant(
  jobId: string,
  userId: string
): Promise<{
  job: JobOwnershipResult;
  participantRole: 'homeowner' | 'contractor';
}> {
  const { data, error } = await serverSupabase
    .from('jobs')
    .select('id, homeowner_id, contractor_id, status, title')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Job not found');
  }

  const job = data as unknown as JobOwnershipResult;

  if (job.homeowner_id === userId) {
    return { job, participantRole: 'homeowner' };
  }
  if (job.contractor_id === userId) {
    return { job, participantRole: 'contractor' };
  }

  throw new ForbiddenError('You are not a participant in this job');
}
