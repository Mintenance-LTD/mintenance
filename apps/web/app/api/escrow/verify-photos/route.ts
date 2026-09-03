import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { validateURLs } from '@/lib/security/url-validation';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

/** Type for escrow with job relation from Supabase (!inner join returns jobs as array) */
interface EscrowJob {
  id: string;
  contractor_id: string;
  homeowner_id: string;
}

interface EscrowWithJob {
  id: string;
  job_id: string;
  status: string;
  payer_id: string;
  payee_id: string;
  jobs: EscrowJob | EscrowJob[];
}

const verifyPhotosSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  jobId: z.string().uuid('Invalid job ID'),
  photoUrls: z.array(z.string().url('Invalid photo URL')).min(1, 'At least one photo is required'),
});

/**
 * POST /api/escrow/verify-photos
 * Verify completion photos for escrow release
 */
export const POST = withApiHandler(
  { roles: ['contractor', 'admin'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, verifyPhotosSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, jobId: bodyJobId, photoUrls } = validation.data;

    // Verify user has permission (contractor or homeowner)
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, status, payer_id, payee_id, jobs!inner(id, contractor_id, homeowner_id)')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    const typedEscrow = escrow as unknown as EscrowWithJob;
    const job = Array.isArray(typedEscrow.jobs) ? typedEscrow.jobs[0] : typedEscrow.jobs;
    const canVerify =
      user.role === 'admin' ||
      (user.role === 'contractor' && typedEscrow.payee_id === user.id);

    if (!canVerify) {
      throw new ForbiddenError('Only the assigned contractor can verify photos for this escrow');
    }

    if (!['held', 'awaiting_homeowner_approval'].includes(typedEscrow.status)) {
      throw new ConflictError(
        'This escrow is no longer available for completion-photo verification.'
      );
    }

    // The escrow relationship is authoritative; never let the client choose
    // a different job for AI analysis or auto-release scheduling.
    const jobId = typedEscrow.job_id;
    if (!job || job.id !== jobId) {
      throw new NotFoundError('Job not found');
    }
    if (bodyJobId !== jobId) {
      logger.warn('Ignoring mismatched client jobId during photo verification', {
        service: 'escrow-verify-photos',
        userId: user.id,
        escrowId,
        bodyJobId,
        escrowJobId: jobId,
      });
    }

    const urlValidation = await validateURLs(photoUrls, true);
    if (urlValidation.invalid.length > 0) {
      throw new ForbiddenError('One or more photo URLs are not allowed');
    }
    const validatedPhotoUrls = urlValidation.valid;

    // Verify photos
    const verificationResult = await EscrowReleaseAgent.verifyCompletionPhotos(
      escrowId,
      jobId,
      validatedPhotoUrls
    );

    if (!verificationResult) {
      throw new InternalServerError('Failed to verify photos');
    }

    // Calculate auto-release date if verification passed
    if (verificationResult.status === 'verified') {
      await EscrowReleaseAgent.calculateAutoReleaseDate(
        escrowId,
        jobId,
        job.contractor_id
      );
    }

    return NextResponse.json({
      success: true,
      verification: verificationResult,
    });
  }
);
