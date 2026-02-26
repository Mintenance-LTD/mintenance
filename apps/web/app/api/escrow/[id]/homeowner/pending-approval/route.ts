import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface PhotoMetadata {
  photo_url: string;
  angle_type?: string;
  quality_score?: number;
  photo_type?: string;
}

interface JobWithPhotos {
  id: string;
  title: string;
  homeowner_id: string;
  before_photos?: PhotoMetadata[];
  after_photos?: PhotoMetadata[];
}

interface EscrowRecord {
  id: string;
  amount: number;
  homeowner_approval: boolean | null;
  auto_approval_date: string | null;
  jobs: JobWithPhotos | JobWithPhotos[];
}

/**
 * GET /api/escrow/:id/homeowner/pending-approval
 * Get pending approval details
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const escrowId = params.id as string;

    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        amount,
        homeowner_approval,
        auto_approval_date,
        jobs!inner (
          id,
          title,
          homeowner_id,
          before_photos:job_photos_metadata!jobs_photos_metadata_job_id_fkey (
            photo_url,
            angle_type,
            quality_score
          ),
          after_photos:job_photos_metadata!jobs_photos_metadata_job_id_fkey (
            photo_url,
            angle_type,
            quality_score
          )
        )
      `)
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) throw new NotFoundError('Escrow not found');

    const typedEscrow = escrow as unknown as EscrowRecord;
    const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
    if (!job || (job.homeowner_id !== user.id && user.role !== 'admin')) throw new ForbiddenError('Unauthorized');

    const beforePhotos = (job.before_photos || []).filter((p: PhotoMetadata) => p.photo_type === 'before');
    const afterPhotos = (job.after_photos || []).filter((p: PhotoMetadata) => p.photo_type === 'after');

    return NextResponse.json({
      success: true,
      data: {
        escrowId: typedEscrow.id,
        amount: typedEscrow.amount,
        jobTitle: job.title,
        homeownerApproval: typedEscrow.homeowner_approval,
        autoApprovalDate: typedEscrow.auto_approval_date,
        beforePhotos: beforePhotos.map((p: PhotoMetadata) => ({ url: p.photo_url, angleType: p.angle_type, qualityScore: p.quality_score })),
        afterPhotos: afterPhotos.map((p: PhotoMetadata) => ({ url: p.photo_url, angleType: p.angle_type, qualityScore: p.quality_score })),
      },
    });
  }
);
