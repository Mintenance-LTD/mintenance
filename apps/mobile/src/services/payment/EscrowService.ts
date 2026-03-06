import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { apiRequest } from './apiHelper';
import type { EscrowTransactionRow } from './types';

export class EscrowService {
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<{ id: string; status: string; amount: number }> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        payer_id: payerId,
        payee_id: payeeId,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create escrow transaction');
    }

    return data as { id: string; status: string; amount: number };
  }

  static async holdPaymentInEscrow(
    transactionId: string,
    paymentIntentId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) {
      throw new Error(error.message || 'Failed to hold payment in escrow');
    }
  }

  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    const { data: transaction, error: transactionError } = await supabase
      .from('escrow_transactions')
      .select('id, amount, payment_intent_id, job:job_id ( contractor_id )')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      throw new Error(transactionError?.message || 'Escrow transaction not found');
    }

    const contractorId = (transaction as Record<string, Record<string, string>>).job?.contractor_id;

    await apiRequest('/api/payments/release-escrow', {
      method: 'POST',
      body: {
        transactionId,
        contractorId,
        amount: (transaction as Record<string, unknown>).amount,
      },
    });

    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update escrow status');
    }
  }

  static async refundEscrowPayment(transactionId: string): Promise<void> {
    await apiRequest('/api/payments/refund', {
      method: 'POST',
      body: { transactionId },
    });

    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update escrow status');
    }
  }

  static async releaseEscrow(params: {
    paymentIntentId: string;
    jobId: string;
    contractorId: string;
    amount: number;
  }): Promise<{ success: boolean; transfer_id?: string }> {
    const data = await apiRequest<{ success: boolean; transfer_id?: string }>(
      '/api/payments/release-escrow',
      { method: 'POST', body: params as unknown as Record<string, unknown> }
    );

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ status: 'completed', payment_released: true })
      .eq('id', params.jobId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update job status');
    }

    return data as { success: boolean; transfer_id?: string };
  }

  static async refundPayment(params: {
    paymentIntentId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; refund_id?: string }> {
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    return apiRequest<{ success: boolean; refund_id?: string }>(
      '/api/payments/refund',
      {
        method: 'POST',
        body: {
          paymentIntentId: params.paymentIntentId,
          amount: params.amount,
          reason: params.reason,
        },
      }
    );
  }

  static async getUserPaymentHistory(userId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select(
        `*, job:job_id ( title ), payer:payer_id ( first_name, last_name ), payee:payee_id ( first_name, last_name )`
      )
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch user payment history', { error, userId });
      return [];
    }

    return data || [];
  }

  static async getJobEscrowTransactions(jobId: string): Promise<
    (EscrowTransactionRow & { jobId: string })[]
  > {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch job escrow transactions', { error, jobId });
      return [];
    }

    return (data || []).map((transaction: EscrowTransactionRow) => ({
      ...transaction,
      jobId: transaction.job_id,
    }));
  }
}
