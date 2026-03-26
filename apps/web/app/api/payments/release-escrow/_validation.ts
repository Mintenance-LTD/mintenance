import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Validates MFA for high-risk escrow releases.
 * Returns a NextResponse (403) if MFA is required but missing/invalid,
 * or null if MFA passed or was not required.
 */
export async function validateEscrowMFA(
  userId: string,
  escrowTransactionId: string,
  amount: number,
  mfaToken: string | null
): Promise<NextResponse | null> {
  const { requiresMFA, HighRiskOperation } =
    await import('@/lib/payments/high-risk-checks');
  const mfaCheck = await requiresMFA(
    HighRiskOperation.ESCROW_RELEASE,
    amount,
    userId
  );

  if (!mfaCheck.required) return null;

  if (!mfaToken) {
    logger.warn('MFA required for escrow release but no token provided', {
      service: 'payments',
      userId,
      escrowTransactionId,
      amount,
      riskScore: mfaCheck.riskScore,
    });
    return NextResponse.json(
      {
        error: 'MFA verification required',
        reason: mfaCheck.reason,
        riskScore: mfaCheck.riskScore,
        mfaRequired: true,
      },
      { status: 403 }
    );
  }

  const { validateMFAForPayment } =
    await import('@/lib/payments/high-risk-checks');
  const mfaValidation = await validateMFAForPayment(
    userId,
    mfaToken,
    HighRiskOperation.ESCROW_RELEASE
  );

  if (!mfaValidation.valid) {
    logger.warn('Invalid MFA token for escrow release', {
      service: 'payments',
      userId,
      escrowTransactionId,
      amount,
    });
    return NextResponse.json(
      {
        error: 'MFA verification failed',
        reason: mfaValidation.reason,
        mfaRequired: true,
      },
      { status: 403 }
    );
  }

  logger.info('MFA validated successfully for escrow release', {
    service: 'payments',
    userId,
    escrowTransactionId,
    amount,
  });

  return null;
}
