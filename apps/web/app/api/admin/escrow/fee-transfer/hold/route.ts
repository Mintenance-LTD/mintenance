import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const holdFeeTransferSchema = z.object({
  feeTransferId: z.string().uuid('Invalid fee transfer ID'),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * POST /api/admin/escrow/fee-transfer/hold
 * Admin endpoint to hold a fee transfer
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

    const validation = await validateRequest(request, holdFeeTransferSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { feeTransferId, reason } = validation.data;

    await FeeTransferService.holdFeeTransfer(feeTransferId, user.id, reason);

    logger.info('Fee transfer held by admin', {
      service: 'admin',
      adminId: user.id,
      feeTransferId,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Fee transfer held successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

