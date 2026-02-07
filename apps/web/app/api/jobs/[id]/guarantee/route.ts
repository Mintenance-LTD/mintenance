import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { GuaranteeService } from '@/lib/services/payment/GuaranteeService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required for guarantee operations');
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
        throw new BadRequestError('Only verified contractors are eligible for guarantees');
      }

      const guaranteeId = await GuaranteeService.createGuarantee(
        jobId,
        job.contractor_id,
        job.homeowner_id,
        job.budget || 0
      );

      if (!guaranteeId) {
        throw new Error('Failed to create guarantee');
      }

      return NextResponse.json({ message: 'Guarantee created successfully', guaranteeId });
    }

    if (action === 'claim') {
      if (user.role !== 'homeowner') {
        throw new ForbiddenError('Only homeowners can submit guarantee claims');
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
        throw new NotFoundError('Guarantee not found');
      }

      const success = await GuaranteeService.submitClaim(guarantee.id, user.id, reason, evidence || []);

      if (!success) {
        throw new Error('Failed to submit claim');
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
        throw new NotFoundError('Claim not found');
      }

      const success = await GuaranteeService.resolveClaim(guarantee.id, user.id, resolution, payoutAmount);

      if (!success) {
        throw new Error('Failed to resolve claim');
      }

      return NextResponse.json({ message: 'Claim resolved successfully' });
    }

    throw new BadRequestError('Invalid action');
  } catch (error) {
    return handleAPIError(error);
  }
}

