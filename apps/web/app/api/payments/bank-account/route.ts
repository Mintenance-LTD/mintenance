import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const bankAccountSchema = z.object({
  accountNumber: z.string().trim().min(6, 'Account number is required'),
  sortCode: z.string().trim().min(6, 'Sort code is required'),
  accountHolderName: z
    .string()
    .trim()
    .min(1, 'Account holder name is required'),
});

/**
 * POST /api/payments/bank-account
 * Register bank account details for contractor payouts (mobile compatibility)
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, bankAccountSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { accountNumber, sortCode, accountHolderName } = validation.data;

    logger.info('Bank account details received', {
      service: 'payments',
      userId: user.id,
      sortCode: sortCode.substring(0, 2) + '****',
      accountHolderName,
    });

    // TODO: Integrate with Stripe Connect for actual bank account setup
    return NextResponse.json({
      success: true,
      message: 'Bank account details received',
    });
  }
);
