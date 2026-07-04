/**
 * Tenant-ownership guard for assessment anchors (SEC-001, CWE-639).
 *
 * POST /api/building-surveyor/assess and POST /api/assessments/walkthrough
 * both accept optional jobId / propertyId anchors and persist the resulting
 * building_assessments row via the service-role client, which bypasses RLS.
 * Without this guard any authenticated user could bind an assessment to
 * another tenant's job or property by posting a leaked/guessed UUID.
 *
 * jobId: caller must be the job's homeowner or assigned contractor, or a
 * property-team member (view) on the job's property when it has one.
 * propertyId: caller must pass PropertyTeamService 'view' (owner or team).
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { logger } from '@mintenance/shared';

export async function authorizeAssessmentAnchors(params: {
  userId: string;
  jobId?: string;
  propertyId?: string;
  /** Log-context service name of the calling route. */
  service: string;
}): Promise<void> {
  const { userId, jobId, propertyId, service } = params;

  if (jobId) {
    const { data: job } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id, property_id')
      .eq('id', jobId)
      .single();

    // A missing job is deliberately indistinguishable from a forbidden one.
    let allowed = Boolean(
      job && (job.homeowner_id === userId || job.contractor_id === userId)
    );
    if (!allowed && job?.property_id) {
      const { authorized } = await PropertyTeamService.authorize(
        userId,
        job.property_id,
        'view'
      );
      allowed = authorized;
    }
    if (!allowed) {
      logger.warn('Assessment denied — job access', {
        service,
        userId,
        jobId,
      });
      throw new ForbiddenError('You do not have access to this job');
    }
  }

  if (propertyId) {
    const { authorized } = await PropertyTeamService.authorize(
      userId,
      propertyId,
      'view'
    );
    if (!authorized) {
      logger.warn('Assessment denied — property access', {
        service,
        userId,
        propertyId,
      });
      throw new ForbiddenError('You do not have access to this property');
    }
  }
}
