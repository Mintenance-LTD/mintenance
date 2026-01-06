import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const batchTransferSchema = z.object({
  feeTransferIds: z.array(z.string().uuid('Invalid fee transfer ID')).min(1),
});

/**
 * POST /api/admin/escrow/fee-transfer/batch
 * Admin endpoint to batch transfer multiple fees
 */
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const validation = await validateRequest(request, batchTransferSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { feeTransferIds } = validation.data;

    const result = await FeeTransferService.batchTransferFees(
      feeTransferIds,
      user.id
    );

    logger.info('Batch fee transfer completed', {
      service: 'admin',
      adminId: user.id,
      success: result.success,
      failed: result.failed,
      total: feeTransferIds.length,
    });

    return NextResponse.json({
      success: true,
      message: `Batch transfer completed: ${result.success} succeeded, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

