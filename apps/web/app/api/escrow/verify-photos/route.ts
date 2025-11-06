import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

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
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    const job = (escrow as any).jobs;
    const canVerify =
      user.role === 'admin' ||
      (user.role === 'contractor' && job.contractor_id === user.id) ||
      (user.role === 'homeowner' && job.homeowner_id === user.id);

    if (!canVerify) {
      return NextResponse.json({ error: 'Unauthorized to verify photos for this escrow' }, { status: 403 });
    }

    // Verify photos
    const verificationResult = await EscrowReleaseAgent.verifyCompletionPhotos(escrowId, jobId, photoUrls);

    if (!verificationResult) {
      return NextResponse.json({ error: 'Failed to verify photos' }, { status: 500 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

