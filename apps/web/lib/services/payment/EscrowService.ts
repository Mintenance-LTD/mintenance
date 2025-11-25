import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { asError, type EscrowTransactionRow, type SupabaseUserName } from './types';
import type { EscrowTransaction } from '@mintenance/types';

export class EscrowService {
  /**
   * Create escrow transaction
   */
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<EscrowTransaction> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .insert([
          {
            job_id: jobId,
            payer_id: payerId,
            payee_id: payeeId,
            amount,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('Error creating escrow transaction', error);
        throw new Error('Failed to create escrow transaction');
      }

      return this.formatEscrowTransaction(data);
    } catch (error) {
      logger.error('Create escrow transaction error', error);
      throw asError(error, 'Failed to create escrow transaction. Please ensure database connection is available.');
    }
  }

  /**
   * Hold payment in escrow
   */
  static async holdPaymentInEscrow(
    transactionId: string,
    paymentIntentId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) {
        logger.error('Error holding payment in escrow', error);
        throw new Error('Failed to hold payment in escrow');
      }
    } catch (error) {
      logger.error('Hold payment in escrow error', error);
      throw asError(error, 'Failed to hold payment in escrow. Please contact support if this persists.');
    }
  }

  /**
   * Release payment from escrow
   */
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('id, amount, payment_intent_id, job:jobs(contractor_id)')
        .eq('id', transactionId)
        .single()
        .returns<{
          id: string;
          amount: number;
          payment_intent_id: string;
          job: { contractor_id: string } | null;
        }>();

      if (fetchError || !transaction) {
        throw fetchError ?? new Error('Transaction not found');
      }

      if (!transaction.payment_intent_id) {
        throw new Error('No payment intent associated with this transaction');
      }

      const { error: transferError } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          transactionId,
          paymentIntentId: transaction.payment_intent_id,
          contractorId: transaction.job?.contractor_id ?? null,
          amount: transaction.amount,
        },
      });

      if (transferError) {
        throw transferError;
      }

      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      logger.error('Release escrow payment error', error);
      throw asError(error, 'Failed to release escrow payment.');
    }
  }

  /**
   * Auto-release escrow based on contractor payout tier
   */
  static async autoReleaseByTier(jobId: string): Promise<boolean> {
    try {
      const { PayoutTierService } = await import('@/lib/services/payment/PayoutTierService');
      
      // Get escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('id, job:jobs(contractor_id, status)')
        .eq('job_id', jobId)
        .eq('status', 'held')
        .single();

      if (escrowError || !escrow || !escrow.job) {
        return false;
      }

      // Handle both array and single object cases
      const job = Array.isArray(escrow.job) ? escrow.job[0] : escrow.job;
      if (!job) {
        return false;
      }

      const contractorId = job.contractor_id;
      if (!contractorId) {
        return false;
      }

      // Check if job is completed
      if (job.status !== 'completed') {
        return false;
      }

      // Get payout speed for contractor
      const payoutHours = await PayoutTierService.getPayoutSpeed(contractorId);
      const payoutDeadline = new Date(Date.now() + payoutHours * 60 * 60 * 1000);

      // Check if payout deadline has passed
      if (new Date() >= payoutDeadline) {
        // Check if there are any active disputes
        const { count: disputeCount } = await supabase
          .from('escrow_payments')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', jobId)
          .eq('status', 'disputed');

        if ((disputeCount || 0) === 0) {
          // Auto-release
          await this.releaseEscrowPayment(escrow.id);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error in auto-release by tier', error);
      return false;
    }
  }

  /**
   * Refund escrow payment
   */
  static async refundEscrowPayment(
    transactionId: string,
    reason: string = 'Refund requested'
  ): Promise<void> {
    try {
      const { error: refundError } = await supabase.functions.invoke('refund-escrow-payment', {
        body: { transactionId, reason },
      });

      if (refundError) {
        throw refundError;
      }

      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      logger.error('Refund escrow payment error', error);
      throw asError(error, 'Failed to refund escrow payment.');
    }
  }

  /**
   * Get escrow transactions for a job
   */
  static async getJobEscrowTransactions(
    jobId: string
  ): Promise<EscrowTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching job escrow transactions', error);
        throw new Error('Failed to load escrow transactions for this job.');
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      logger.error('Get job escrow transactions error', error);
      throw asError(error, 'Failed to load escrow transactions for this job.');
    }
  }

  /**
   * Get user's payment history
   */
  static async getUserPaymentHistory(
    userId: string
  ): Promise<EscrowTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          `
          *,
          job:jobs(title, description),
          payer:users!escrow_transactions_payer_id_fkey(first_name, last_name),
          payee:users!escrow_transactions_payee_id_fkey(first_name, last_name)
        `
        )
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user payment history', error);
        throw new Error('Failed to load your payment history.');
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      logger.error('Get user payment history error', error);
      throw asError(error, 'Failed to load your payment history.');
    }
  }

  /**
   * Helper method to format escrow transaction
   */
  private static formatEscrowTransaction(row: EscrowTransactionRow): EscrowTransaction {
    const toName = (value?: SupabaseUserName | null) => ({
      first_name: value?.first_name ?? '',
      last_name: value?.last_name ?? '',
    });

    return {
      id: row.id,
      jobId: row.job_id,
      payerId: row.payer_id,
      payeeId: row.payee_id,
      amount: row.amount,
      status: (row.status as EscrowTransaction['status']) ?? 'pending',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentIntentId: row.payment_intent_id ?? undefined,
      releasedAt: row.released_at ?? undefined,
      refundedAt: row.refunded_at ?? undefined,
      job: row.job
        ? {
            title: row.job.title ?? '',
            description: row.job.description ?? '',
          }
        : undefined,
      payer: row.payer ? toName(row.payer) : undefined,
      payee: row.payee ? toName(row.payee) : undefined,
    };
  }
}
