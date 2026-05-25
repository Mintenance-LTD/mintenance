/**
 * GET /api/jobs/:id/details
 *
 * Aggregate endpoint that returns the secondary state mobile's
 * `JobDetailsViewModel` previously gathered with four direct supabase
 * queries (contracts, escrow_transactions, reviews,
 * building_assessments). Routing it through the API closes the
 * 2026-04-30 audit P0-1 finding for that file and lets the server
 * own ownership checks instead of relying on RLS alone.
 *
 * Access mirrors GET /api/jobs/:id:
 *   - Homeowner who posted the job
 *   - Contractor currently assigned
 *   - Any contractor when the job is still `posted` and unassigned
 *     (so the bid flow keeps working)
 *   - Admins
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

interface JobAccessRow {
  id: string;
  homeowner_id: string | null;
  contractor_id: string | null;
  status: string | null;
}

interface ContractRow {
  id: string;
  status: string | null;
}

interface EscrowRow {
  id: string;
  status: string | null;
}

interface ReviewRow {
  id: string;
}

interface BuildingAssessmentRow {
  id: string;
  damage_type: string | null;
  severity: string | null;
  confidence: number | null;
  urgency: string | null;
  assessment_data: Record<string, unknown> | null;
  created_at: string | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const jobId = params.id as string;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    const row = job as unknown as JobAccessRow;
    const isHomeowner = row.homeowner_id === user.id;
    const isAssignedContractor = row.contractor_id === user.id;
    const isContractorViewingOpenJob =
      user.role === 'contractor' &&
      row.status === 'posted' &&
      (row.contractor_id === null || row.contractor_id === undefined);

    if (
      !isHomeowner &&
      !isAssignedContractor &&
      !isContractorViewingOpenJob &&
      user.role !== 'admin'
    ) {
      logger.warn('Job details access denied', {
        service: 'jobs',
        userId: user.id,
        jobId,
      });
      throw new ForbiddenError('You do not have access to this job');
    }

    const [
      contractsRes,
      escrowRes,
      reviewsRes,
      assessmentRes,
      beforePhotoRes,
      afterPhotoRes,
    ] = await Promise.allSettled([
      serverSupabase
        .from('contracts')
        .select('id, status')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('escrow_transactions')
        .select('id, status')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('reviews')
        .select('id')
        .eq('job_id', jobId)
        .eq('reviewer_id', user.id)
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('building_assessments')
        .select(
          'id, damage_type, severity, confidence, urgency, assessment_data, created_at'
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // 2026-05-25 audit-P0-3: surface counts of before/after photos so
      // the contractor CTA can show "Start Job" on a return visit when
      // before-photos already exist. Previously the gate lived in the
      // upload screen as a one-shot Alert, so a contractor who uploaded
      // photos, closed the app, and came back had no path to start the
      // job — explaining the live 6-assigned-but-0-in_progress state.
      serverSupabase
        .from('job_photos_metadata')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('photo_type', 'before'),
      serverSupabase
        .from('job_photos_metadata')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('photo_type', 'after'),
    ]);

    const contract =
      contractsRes.status === 'fulfilled'
        ? ((contractsRes.value.data ?? null) as unknown as ContractRow | null)
        : null;
    const escrow =
      escrowRes.status === 'fulfilled'
        ? ((escrowRes.value.data ?? null) as unknown as EscrowRow | null)
        : null;
    const review =
      reviewsRes.status === 'fulfilled'
        ? ((reviewsRes.value.data ?? null) as unknown as ReviewRow | null)
        : null;
    const assessment =
      assessmentRes.status === 'fulfilled'
        ? ((assessmentRes.value.data ??
            null) as unknown as BuildingAssessmentRow | null)
        : null;

    const beforePhotoCount =
      beforePhotoRes.status === 'fulfilled'
        ? (beforePhotoRes.value.count ?? 0)
        : 0;
    const afterPhotoCount =
      afterPhotoRes.status === 'fulfilled'
        ? (afterPhotoRes.value.count ?? 0)
        : 0;

    return NextResponse.json({
      contractStatus: contract?.status ?? null,
      escrowStatus: escrow?.status ?? null,
      hasReviewed: !!review,
      buildingAssessment: assessment
        ? {
            id: assessment.id,
            damageType: assessment.damage_type,
            severity: assessment.severity,
            confidence: assessment.confidence,
            urgency: assessment.urgency,
            assessmentData: assessment.assessment_data,
            createdAt: assessment.created_at,
          }
        : null,
      beforePhotoCount,
      afterPhotoCount,
    });
  }
);
