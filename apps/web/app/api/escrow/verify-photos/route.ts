import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

/** Type for escrow with job relation from Supabase */
interface EscrowWithJob {
  id: string;
  payer_id: string;
  payee_id: string;
  jobs: {
    id: string;
    contractor_id: string;
    homeowner_id: string;
  };
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
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Validate request
    const validation = await validateRequest(request, verifyPhotosSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowId, jobId, photoUrls } = validation.data;

    // Verify user has permission (contractor or homeowner)
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payer_id, payee_id, jobs!inner(id, contractor_id, homeowner_id)')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow not found');
    }

    const typedEscrow = escrow as EscrowWithJob;
    const job = typedEscrow.jobs;
    const canVerify =
      user.role === 'admin' ||
      (user.role === 'contractor' && job.contractor_id === user.id) ||
      (user.role === 'homeowner' && job.homeowner_id === user.id);

    if (!canVerify) {
      throw new ForbiddenError('Unauthorized to verify photos for this escrow');
    }

    // Verify photos
    const verificationResult = await EscrowReleaseAgent.verifyCompletionPhotos(escrowId, jobId, photoUrls);

    if (!verificationResult) {
      throw new InternalServerError('Failed to verify photos');
    }

    // Calculate auto-release date if verification passed
    if (verificationResult.status === 'verified') {
      await EscrowReleaseAgent.calculateAutoReleaseDate(escrowId, jobId, job.contractor_id);
    }

    return NextResponse.json({
      success: true,
      verification: verificationResult,
    });
  } catch (error) {
    logger.error('Error verifying escrow photos', error, {
      service: 'escrow-verify-photos',
    });
    throw new InternalServerError('Internal server error');
  }
}

