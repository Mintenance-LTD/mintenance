import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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
  jobs: JobWithPhotos | JobWithPhotos[];
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
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const { id: escrowId } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
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
      throw new NotFoundError('Escrow not found');
    }

    const typedEscrow = escrow as unknown as EscrowRecord;
    const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
    if (!job || (job.homeowner_id !== user.id && user.role !== 'admin')) {
      throw new ForbiddenError('Unauthorized');
    }

    // Narrow to a consistent shape after handling array/object ambiguity
    const escrowId_val = typedEscrow.id;
    const amount_val = typedEscrow.amount;
    const homeownerApproval_val = typedEscrow.homeowner_approval;
    const autoApprovalDate_val = typedEscrow.auto_approval_date;

    // Filter photos by type
    const beforePhotos = (job.before_photos || []).filter((p: PhotoMetadata) => p.photo_type === 'before');
    const afterPhotos = (job.after_photos || []).filter((p: PhotoMetadata) => p.photo_type === 'after');

    return NextResponse.json({
      success: true,
      data: {
        escrowId: escrowId_val,
        amount: amount_val,
        jobTitle: job.title,
        homeownerApproval: homeownerApproval_val,
        autoApprovalDate: autoApprovalDate_val,
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
    throw new InternalServerError('Failed to fetch approval details');
  }
}

