import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface PaymentVerificationResult {
  hasPlatformPayment: boolean;
  escrowPaymentId: string | null;
  amount: number | null;
  status: string | null;
  message?: string;
}

/**
 * Service for enforcing platform payments and preventing cash transactions
 */
export class PaymentEnforcement {
  /**
   * Verify that a job has a platform payment before allowing completion
   */
  static async verifyJobPayment(jobId: string): Promise<PaymentVerificationResult> {
    try {
      // Check for escrow payment
      const { data: escrowPayment, error } = await serverSupabase
        .from('escrow_payments')
        .select('id, amount, status')
        .eq('job_id', jobId)
        .in('status', ['held', 'released'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No escrow payment found
          return {
            hasPlatformPayment: false,
            escrowPaymentId: null,
            amount: null,
            status: null,
            message: 'No platform payment found for this job. Payment must be made through the platform.',
          };
        }

        logger.error('Error checking escrow payment', {
          service: 'PaymentEnforcement',
          jobId,
          error: error.message,
        });

        return {
          hasPlatformPayment: false,
          escrowPaymentId: null,
          amount: null,
          status: null,
          message: 'Unable to verify payment. Please contact support.',
        };
      }

      if (!escrowPayment) {
        return {
          hasPlatformPayment: false,
          escrowPaymentId: null,
          amount: null,
          status: null,
          message: 'No platform payment found. All payments must be made through the platform.',
        };
      }

      return {
        hasPlatformPayment: true,
        escrowPaymentId: escrowPayment.id,
        amount: parseFloat(escrowPayment.amount.toString()),
        status: escrowPayment.status,
      };
    } catch (err) {
      logger.error('Error verifying job payment', {
        service: 'PaymentEnforcement',
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });

      return {
        hasPlatformPayment: false,
        escrowPaymentId: null,
        amount: null,
        status: null,
        message: 'Error verifying payment. Please contact support.',
      };
    }
  }

  /**
   * Check if job can be marked as completed (requires platform payment)
   */
  static async canCompleteJob(jobId: string): Promise<{ allowed: boolean; reason?: string }> {
    const verification = await this.verifyJobPayment(jobId);

    if (!verification.hasPlatformPayment) {
      return {
        allowed: false,
        reason:
          verification.message ||
          'This job cannot be completed without a platform payment. All payments must be processed through Mintenance for your protection.',
      };
    }

    // Check if payment is released or can be released
    if (verification.status === 'released') {
      return { allowed: true };
    }

    if (verification.status === 'held') {
      return {
        allowed: true,
        reason: 'Payment is held in escrow and will be released upon job completion.',
      };
    }

    return {
      allowed: false,
      reason: 'Payment must be confirmed before job completion.',
    };
  }

  /**
   * Record payment method used for a job (for tracking and analytics)
   */
  static async recordPaymentMethod(
    jobId: string,
    paymentMethod: 'platform_escrow' | 'platform_direct' | 'cash' | 'other',
    notes?: string
  ): Promise<boolean> {
    try {
      // Update job metadata with payment method
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('metadata')
        .eq('id', jobId)
        .single();

      const metadata = (job?.metadata as Record<string, any>) || {};

      metadata.payment_method = paymentMethod;
      metadata.payment_method_recorded_at = new Date().toISOString();
      if (notes) {
        metadata.payment_method_notes = notes;
      }

      const { error } = await serverSupabase
        .from('jobs')
        .update({ metadata })
        .eq('id', jobId);

      if (error) {
        logger.error('Failed to record payment method', {
          service: 'PaymentEnforcement',
          jobId,
          error: error.message,
        });
        return false;
      }

      // Log cash payments for monitoring
      if (paymentMethod === 'cash') {
        logger.warn('Cash payment recorded for job', {
          service: 'PaymentEnforcement',
          jobId,
          notes,
        });
      }

      return true;
    } catch (err) {
      logger.error('Error recording payment method', {
        service: 'PaymentEnforcement',
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Get payment terms text for contracts
   */
  static getPaymentTerms(): string {
    return `
      PAYMENT TERMS:
      
      1. All payments must be processed through the Mintenance platform.
      2. Payments are held in escrow until job completion and contractor approval.
      3. Cash payments are not accepted and will void this contract.
      4. Platform fees (5%) apply to all transactions for service protection.
      5. Payment must be confirmed before job completion can be marked.
      
      By proceeding with this job, both parties agree to these payment terms.
    `;
  }
}

