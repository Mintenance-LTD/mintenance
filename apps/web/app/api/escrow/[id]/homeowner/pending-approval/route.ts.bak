import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// Type definitions for escrow approval data
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
  jobs: JobWithPhotos;
}

/**
 * GET /api/escrow/:id/homeowner/pending-approval
 * Get pending approval details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: escrowId } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const typedEscrow = escrow as any;
    const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
    if (!job || (job.homeowner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Filter photos by type
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
        beforePhotos: beforePhotos.map((p: PhotoMetadata) => ({
          url: p.photo_url,
          angleType: p.angle_type,
          qualityScore: p.quality_score,
        })),
        afterPhotos: afterPhotos.map((p: PhotoMetadata) => ({
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

