import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/escrow/:id/homeowner/pending-approval
 * Get pending approval details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = params.id;

    // Get escrow with photos
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
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
      `
      )
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    const job = (escrow as any).jobs;
    if (job.homeowner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Filter photos by type
    const beforePhotos = (job.before_photos || []).filter((p: any) => p.photo_type === 'before');
    const afterPhotos = (job.after_photos || []).filter((p: any) => p.photo_type === 'after');

    return NextResponse.json({
      success: true,
      data: {
        escrowId: escrow.id,
        amount: escrow.amount,
        jobTitle: job.title,
        homeownerApproval: escrow.homeowner_approval,
        autoApprovalDate: escrow.auto_approval_date,
        beforePhotos: beforePhotos.map((p: any) => ({
          url: p.photo_url,
          angleType: p.angle_type,
          qualityScore: p.quality_score,
        })),
        afterPhotos: afterPhotos.map((p: any) => ({
          url: p.photo_url,
          angleType: p.angle_type,
          qualityScore: p.quality_score,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching pending approval', error, { service: 'homeowner-pending-approval' });
    return NextResponse.json({ error: 'Failed to fetch approval details' }, { status: 500 });
  }
}

