import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { GuaranteeService } from '@/lib/services/payment/GuaranteeService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      // Get job details
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, contractor_id, homeowner_id, budget')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      if (!job.contractor_id) {
        return NextResponse.json({ error: 'Job must have an assigned contractor' }, { status: 400 });
      }

      // Check if contractor is verified
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('admin_verified')
        .eq('id', job.contractor_id)
        .single();

      if (!contractor?.admin_verified) {
        return NextResponse.json({ error: 'Only verified contractors are eligible for guarantees' }, { status: 400 });
      }

      const guaranteeId = await GuaranteeService.createGuarantee(
        jobId,
        job.contractor_id,
        job.homeowner_id,
        job.budget || 0
      );

      if (!guaranteeId) {
        return NextResponse.json({ error: 'Failed to create guarantee' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Guarantee created successfully', guaranteeId });
    }

    if (action === 'claim') {
      if (user.role !== 'homeowner') {
        return NextResponse.json({ error: 'Only homeowners can submit guarantee claims' }, { status: 403 });
      }

      const validation = await validateRequest(request, submitClaimSchema);
      if ('headers' in validation) {
        return validation;
      }

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
        return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 });
      }

      const success = await GuaranteeService.submitClaim(guarantee.id, user.id, reason, evidence || []);

      if (!success) {
        return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Claim submitted successfully' });
    }

    if (action === 'resolve' && user.role === 'admin') {
      const validation = await validateRequest(request, resolveClaimSchema);
      if ('headers' in validation) {
        return validation;
      }

      const { resolution, payoutAmount } = validation.data;

      // Get guarantee
      const { data: guarantee } = await serverSupabase
        .from('job_guarantees')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'claimed')
        .single();

      if (!guarantee) {
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
      }

      const success = await GuaranteeService.resolveClaim(guarantee.id, user.id, resolution, payoutAmount);

      if (!success) {
        return NextResponse.json({ error: 'Failed to resolve claim' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Claim resolved successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Error handling guarantee', error, { service: 'jobs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

