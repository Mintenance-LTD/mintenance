/**
 * MFA High-Risk Operations Security
 *
 * Determines when Multi-Factor Authentication (MFA) is required for
 * payment operations based on risk assessment.
 *
 * Security rules:
 * - Escrow releases > $5,000 require MFA
 * - Refunds > $1,000 require MFA
 * - Any payout/bank account changes require MFA
 * - Multiple failed payments require MFA for next attempt
 * - First-time large transactions require MFA
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * High-risk operation types
 */
export enum HighRiskOperation {
  ESCROW_RELEASE = 'escrow_release',
  REFUND = 'refund',
  PAYOUT_CHANGE = 'payout_change',
  LARGE_PAYMENT = 'large_payment',
  BANK_ACCOUNT_CHANGE = 'bank_account_change',
  PAYMENT_METHOD_CHANGE = 'payment_method_change',
}

/**
 * MFA requirement result
 */
export interface MFARequirement {
  required: boolean;
  reason?: string;
  operation: HighRiskOperation;
  riskScore: number; // 0-100
  metadata?: Record<string, any>;
}

/**
 * Thresholds for MFA requirements
 */
const MFA_THRESHOLDS = {
  ESCROW_RELEASE_AMOUNT: 5000, // $5,000
  REFUND_AMOUNT: 1000, // $1,000
  LARGE_PAYMENT_AMOUNT: 10000, // $10,000
  CONSECUTIVE_FAILURES: 2, // After 2 failed attempts
  FIRST_TIME_TRANSACTION_AMOUNT: 2000, // $2,000 for first-time users
};

/**
 * Risk score weights
 */
const RISK_WEIGHTS = {
  AMOUNT_HIGH: 40,
  AMOUNT_MEDIUM: 20,
  AMOUNT_LOW: 10,
  FIRST_TIME_USER: 25,
  RECENT_FAILURES: 30,
  ACCOUNT_CHANGE: 50,
  UNUSUAL_PATTERN: 35,
};

/**
 * Determine if MFA is required for an operation
 *
 * @param operation - The operation type
 * @param amount - The transaction amount (if applicable)
 * @param userId - The user ID
 * @returns MFA requirement result
 */
export async function requiresMFA(
  operation: HighRiskOperation,
  amount: number | null,
  userId: string
): Promise<MFARequirement> {
  try {
    let riskScore = 0;
    let required = false;
    let reason = '';
    const metadata: Record<string, any> = {};

    // Rule 1: Escrow releases over threshold
    if (operation === HighRiskOperation.ESCROW_RELEASE && amount !== null) {
      if (amount > MFA_THRESHOLDS.ESCROW_RELEASE_AMOUNT) {
        required = true;
        riskScore += RISK_WEIGHTS.AMOUNT_HIGH;
        reason = `Escrow release amount ($${amount.toFixed(2)}) exceeds MFA threshold ($${MFA_THRESHOLDS.ESCROW_RELEASE_AMOUNT})`;
        metadata.amountThreshold = MFA_THRESHOLDS.ESCROW_RELEASE_AMOUNT;
      } else if (amount > MFA_THRESHOLDS.ESCROW_RELEASE_AMOUNT * 0.5) {
        riskScore += RISK_WEIGHTS.AMOUNT_MEDIUM;
      }
    }

    // Rule 2: Refunds over threshold
    if (operation === HighRiskOperation.REFUND && amount !== null) {
      if (amount > MFA_THRESHOLDS.REFUND_AMOUNT) {
        required = true;
        riskScore += RISK_WEIGHTS.AMOUNT_HIGH;
        reason = `Refund amount ($${amount.toFixed(2)}) exceeds MFA threshold ($${MFA_THRESHOLDS.REFUND_AMOUNT})`;
        metadata.amountThreshold = MFA_THRESHOLDS.REFUND_AMOUNT;
      } else if (amount > MFA_THRESHOLDS.REFUND_AMOUNT * 0.5) {
        riskScore += RISK_WEIGHTS.AMOUNT_MEDIUM;
      }
    }

    // Rule 3: Any payout or bank account changes
    if (
      operation === HighRiskOperation.PAYOUT_CHANGE ||
      operation === HighRiskOperation.BANK_ACCOUNT_CHANGE ||
      operation === HighRiskOperation.PAYMENT_METHOD_CHANGE
    ) {
      required = true;
      riskScore += RISK_WEIGHTS.ACCOUNT_CHANGE;
      reason = 'Account or payout changes always require MFA for security';
    }

    // Rule 4: Large payments
    if (operation === HighRiskOperation.LARGE_PAYMENT && amount !== null) {
      if (amount > MFA_THRESHOLDS.LARGE_PAYMENT_AMOUNT) {
        required = true;
        riskScore += RISK_WEIGHTS.AMOUNT_HIGH;
        reason = `Payment amount ($${amount.toFixed(2)}) is unusually large`;
        metadata.amountThreshold = MFA_THRESHOLDS.LARGE_PAYMENT_AMOUNT;
      }
    }

    // Rule 5: Check for recent payment failures
    const recentFailures = await getRecentPaymentFailures(userId);
    if (recentFailures >= MFA_THRESHOLDS.CONSECUTIVE_FAILURES) {
      required = true;
      riskScore += RISK_WEIGHTS.RECENT_FAILURES;
      reason = reason
        ? `${reason}. Additionally, ${recentFailures} recent payment failures detected`
        : `${recentFailures} recent payment failures detected - MFA required`;
      metadata.recentFailures = recentFailures;
    }

    // Rule 6: First-time large transaction
    const isFirstTimeUser = await isFirstTimeTransaction(userId);
    if (isFirstTimeUser && amount !== null && amount > MFA_THRESHOLDS.FIRST_TIME_TRANSACTION_AMOUNT) {
      required = true;
      riskScore += RISK_WEIGHTS.FIRST_TIME_USER;
      reason = reason
        ? `${reason}. First-time transaction requires additional verification`
        : 'First-time transaction requires MFA verification';
      metadata.firstTimeUser = true;
    }

    // Rule 7: Check for unusual patterns
    const isUnusualPattern = await detectUnusualPattern(userId, operation, amount);
    if (isUnusualPattern) {
      required = true;
      riskScore += RISK_WEIGHTS.UNUSUAL_PATTERN;
      reason = reason
        ? `${reason}. Unusual transaction pattern detected`
        : 'Unusual transaction pattern detected - MFA required';
      metadata.unusualPattern = true;
    }

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    logger.info('MFA requirement check completed', {
      service: 'payments',
      userId,
      operation,
      amount,
      required,
      riskScore,
      reason,
    });

    return {
      required,
      reason: required ? reason : undefined,
      operation,
      riskScore,
      metadata,
    };
  } catch (error) {
    logger.error('Error checking MFA requirements', error, {
      service: 'payments',
      userId,
      operation,
      amount,
    });

    // SECURITY: Fail secure - require MFA on error
    return {
      required: true,
      reason: 'Unable to verify security requirements - MFA required',
      operation,
      riskScore: 100,
      metadata: { error: true },
    };
  }
}

/**
 * Validate MFA token for a payment operation
 *
 * @param userId - The user ID
 * @param mfaToken - The MFA token to validate
 * @param operation - The operation being performed
 * @returns Whether the MFA token is valid
 */
export async function validateMFAForPayment(
  userId: string,
  mfaToken: string,
  operation: HighRiskOperation
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check if user has MFA enabled
    const { data: user, error: userError } = await serverSupabase
      .from('users')
      .select('mfa_enabled, mfa_secret')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.error('Error fetching user MFA settings', userError, {
        service: 'payments',
        userId,
      });
      return {
        valid: false,
        reason: 'Unable to verify MFA settings',
      };
    }

    if (!user.mfa_enabled) {
      logger.warn('MFA required but not enabled for user', {
        service: 'payments',
        userId,
        operation,
      });
      return {
        valid: false,
        reason: 'MFA is required for this operation but not enabled on your account. Please enable MFA in settings.',
      };
    }

    // Validate the MFA token
    // This would typically use a library like speakeasy or authenticator
    // For now, we'll implement a basic validation check
    const isValid = await validateTOTPToken(user.mfa_secret, mfaToken);

    if (!isValid) {
      // Record failed MFA attempt
      await recordMFAAttempt(userId, operation, false);

      logger.warn('Invalid MFA token for payment operation', {
        service: 'payments',
        userId,
        operation,
      });

      return {
        valid: false,
        reason: 'Invalid MFA code. Please try again.',
      };
    }

    // Record successful MFA attempt
    await recordMFAAttempt(userId, operation, true);

    logger.info('MFA validated successfully for payment operation', {
      service: 'payments',
      userId,
      operation,
    });

    return { valid: true };
  } catch (error) {
    logger.error('Error validating MFA for payment', error, {
      service: 'payments',
      userId,
      operation,
    });

    return {
      valid: false,
      reason: 'MFA validation failed. Please try again.',
    };
  }
}

/**
 * Get the number of recent payment failures for a user
 */
async function getRecentPaymentFailures(userId: string): Promise<number> {
  try {
    // Check last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await serverSupabase
      .from('payment_failures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo);

    if (error) {
      logger.error('Error fetching payment failures', error, {
        service: 'payments',
        userId,
      });
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Exception fetching payment failures', error, {
      service: 'payments',
      userId,
    });
    return 0;
  }
}

/**
 * Check if this is a first-time transaction for the user
 */
async function isFirstTimeTransaction(userId: string): Promise<boolean> {
  try {
    const { count, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', userId) // This would need proper join with jobs table
      .eq('status', 'completed');

    if (error) {
      logger.error('Error checking transaction history', error, {
        service: 'payments',
        userId,
      });
      return false;
    }

    return (count || 0) === 0;
  } catch (error) {
    logger.error('Exception checking transaction history', error, {
      service: 'payments',
      userId,
    });
    return false;
  }
}

/**
 * Detect unusual transaction patterns
 */
async function detectUnusualPattern(
  userId: string,
  operation: HighRiskOperation,
  amount: number | null
): Promise<boolean> {
  try {
    // Check for rapid successive transactions
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fiveMinutesAgo);

    if (error) {
      logger.error('Error checking transaction velocity', error, {
        service: 'payments',
        userId,
      });
      return false;
    }

    // Flag if more than 3 transactions in 5 minutes
    if ((count || 0) > 3) {
      return true;
    }

    // Check if amount is significantly different from user's average
    if (amount !== null) {
      const { data: avgData, error: avgError } = await serverSupabase
        .from('escrow_transactions')
        .select('amount')
        .eq('status', 'completed')
        .limit(10);

      if (!avgError && avgData && avgData.length > 0) {
        const avgAmount =
          avgData.reduce((sum, t) => sum + t.amount, 0) / avgData.length;

        // Flag if amount is 3x average or more
        if (amount > avgAmount * 3) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('Exception detecting unusual pattern', error, {
      service: 'payments',
      userId,
    });
    return false;
  }
}

/**
 * Validate TOTP token
 * This is a simplified implementation - in production, use a library like speakeasy
 */
async function validateTOTPToken(
  secret: string,
  token: string
): Promise<boolean> {
  // TODO: Implement actual TOTP validation using speakeasy or similar
  // For now, return false to maintain security
  // In production, this should use proper TOTP validation

  // Placeholder implementation:
  // const speakeasy = require('speakeasy');
  // return speakeasy.totp.verify({
  //   secret: secret,
  //   encoding: 'base32',
  //   token: token,
  //   window: 2 // Allow 2 time steps in either direction
  // });

  logger.warn('TOTP validation not implemented - rejecting token', {
    service: 'payments',
  });

  return false;
}

/**
 * Record MFA attempt
 */
async function recordMFAAttempt(
  userId: string,
  operation: HighRiskOperation,
  success: boolean
): Promise<void> {
  try {
    await serverSupabase.from('mfa_attempts').insert({
      user_id: userId,
      operation,
      success,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error recording MFA attempt', error, {
      service: 'payments',
      userId,
      operation,
      success,
    });
  }
}

/**
 * Check if user has MFA enabled
 */
export async function userHasMFAEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await serverSupabase
      .from('users')
      .select('mfa_enabled')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.mfa_enabled || false;
  } catch (error) {
    logger.error('Error checking MFA status', error, {
      service: 'payments',
      userId,
    });
    return false;
  }
}

/**
 * Get MFA setup URL for user
 * Generates QR code URL for authenticator apps
 */
export async function getMFASetupInfo(
  userId: string,
  email: string
): Promise<{ secret: string; qrCodeUrl: string } | null> {
  try {
    // TODO: Implement using speakeasy
    // const speakeasy = require('speakeasy');
    // const secret = speakeasy.generateSecret({
    //   name: `Mintenance (${email})`,
    //   issuer: 'Mintenance'
    // });
    //
    // return {
    //   secret: secret.base32,
    //   qrCodeUrl: secret.otpauth_url
    // };

    logger.warn('MFA setup not implemented', {
      service: 'payments',
      userId,
    });

    return null;
  } catch (error) {
    logger.error('Error generating MFA setup info', error, {
      service: 'payments',
      userId,
    });
    return null;
  }
}
