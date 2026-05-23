import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { GuaranteeService } from '@/lib/services/payment/GuaranteeService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const createGuaranteeSchema = z.object({
  jobId: z.string().uuid(),
});

const submitClaimSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  evidence: z.array(z.string()).optional(),
});

const resolveClaimSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  payoutAmount: z.number().min(0).max(2500),
});

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      // 2026-05-23: guarantee amount used to come from `jobs.budget`,
      // which is NULL for every job posted under the open-bidding model.
      // That meant a verified-contractor guarantee was being created
      // with a £0 cover amount — useless. Pull from the released
      // escrow row (or held, if not yet released) so the guarantee
      // tracks the actual money on the line.
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select(
          'id, contractor_id, homeowner_id, budget, escrow_transactions(amount, status)'
        )
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new NotFoundError('Job not found');
      }

      if (!job.contractor_id) {
        throw new BadRequestError('Job must have an assigned contractor');
      }

      // Check if contractor is verified
      const { data: contractor } = await serverSupabase
        .from('profiles')
        .select('admin_verified')
        .eq('id', job.contractor_id)
        .single();

      if (!contractor?.admin_verified) {
        throw new BadRequestError(
          'Only verified contractors are eligible for guarantees'
        );
      }

      // Pick the escrow amount as the source of truth for "money in
      // play". Falls back to budget for legacy jobs that may still
      // have a value. Rejects when neither exists — the guarantee
      // would be meaningless.
      const escrowRows: Array<{
        amount?: number | string | null;
        status?: string | null;
      }> = Array.isArray(job.escrow_transactions)
        ? job.escrow_transactions
        : job.escrow_transactions
          ? [job.escrow_transactions]
          : [];
      const liveEscrow = escrowRows.find(
        (t) =>
          t?.status === 'held' ||
          t?.status === 'release_pending' ||
          t?.status === 'released' ||
          t?.status === 'completed'
      );
      const coverAmount =
        (liveEscrow ? Number(liveEscrow.amount ?? 0) : 0) || job.budget || 0;
      if (coverAmount <= 0) {
        throw new BadRequestError(
          'Guarantee requires escrow to be funded (or a legacy budget). Ask the homeowner to fund the contract first.'
        );
      }

      const guaranteeId = await GuaranteeService.createGuarantee(
        jobId,
        job.contractor_id,
        job.homeowner_id,
        coverAmount
      );

      if (!guaranteeId) {
        throw new Error('Failed to create guarantee');
      }

      return NextResponse.json({
        message: 'Guarantee created successfully',
        guaranteeId,
      });
    }

    if (action === 'claim') {
      if (user.role !== 'homeowner') {
        throw new ForbiddenError('Only homeowners can submit guarantee claims');
      }

      const validation = await validateRequest(request, submitClaimSchema);
      if ('headers' in validation) return validation;

      const { reason, evidence } = validation.data;

      // Get guarantee
      const { data: guarantee, error: guaranteeError } = await serverSupabase
        .from('job_guarantees')
        .select('id, homeowner_id, status')
        .eq('job_id', jobId)
        .eq('homeowner_id', user.id)
        .eq('status', 'active')
        .single();

      if (guaranteeError || !guarantee) {
        throw new NotFoundError('Guarantee not found');
      }

      const success = await GuaranteeService.submitClaim(
        guarantee.id,
        user.id,
        reason,
        evidence || []
      );

      if (!success) {
        throw new Error('Failed to submit claim');
      }

      return NextResponse.json({ message: 'Claim submitted successfully' });
    }

    if (action === 'resolve' && user.role === 'admin') {
      const validation = await validateRequest(request, resolveClaimSchema);
      if ('headers' in validation) return validation;

      const { resolution, payoutAmount } = validation.data;

      // Get guarantee
      const { data: guarantee } = await serverSupabase
        .from('job_guarantees')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'claimed')
        .single();

      if (!guarantee) {
        throw new NotFoundError('Claim not found');
      }

      const success = await GuaranteeService.resolveClaim(
        guarantee.id,
        user.id,
        resolution,
        payoutAmount
      );

      if (!success) {
        throw new Error('Failed to resolve claim');
      }

      return NextResponse.json({ message: 'Claim resolved successfully' });
    }

    throw new BadRequestError('Invalid action');
  }
);
