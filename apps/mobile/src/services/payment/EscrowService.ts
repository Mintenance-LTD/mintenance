import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { apiRequest } from './apiHelper';
import type { EscrowTransactionRow } from './types';

export class EscrowService {
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<{ id: string; status: string; amount: number }> {
    return mobileApiClient.post<{ id: string; status: string; amount: number }>(
      '/api/payments/create-intent',
      { jobId, payerId, payeeId, amount }
    );
  }

  /**
   * 2026-05-26 audit-53 P2: previous signature took
   * (transactionId, paymentIntentId) and POSTed
   * { transactionId, paymentIntentId } — but /api/payments/confirm-intent
   * has a .strict() Zod schema that accepts only
   * { paymentIntentId, jobId } and rejects unknown keys, so every
   * call 400'd before the route's state-machine even ran. Signature
   * now matches the route contract; first arg renamed jobId.
   * Production callers were tests-only — no behavioural drift.
   */
  static async holdPaymentInEscrow(
    jobId: string,
    paymentIntentId: string
  ): Promise<void> {
    await mobileApiClient.post('/api/payments/confirm-intent', {
      paymentIntentId,
      jobId,
    });
  }

  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    // Get escrow details via API
    const transaction = await mobileApiClient.get<{
      id: string;
      amount: number;
      payment_intent_id: string;
      job?: { contractor_id: string };
    }>(`/api/escrow/${transactionId}/status`);

    const contractorId = transaction.job?.contractor_id;

    await apiRequest('/api/payments/release-escrow', {
      method: 'POST',
      body: {
        transactionId,
        contractorId,
        amount: transaction.amount,
      },
    });
  }

  static async refundEscrowPayment(transactionId: string): Promise<void> {
    await apiRequest('/api/payments/refund', {
      method: 'POST',
      body: { transactionId },
    });
  }

  static async releaseEscrow(params: {
    paymentIntentId: string;
    jobId: string;
    contractorId: string;
    amount: number;
  }): Promise<{ success: boolean; transfer_id?: string }> {
    return apiRequest<{ success: boolean; transfer_id?: string }>(
      '/api/payments/release-escrow',
      { method: 'POST', body: params as unknown as Record<string, unknown> }
    );
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
    try {
      // userId is intentionally not sent as a query param; the server derives
      // the caller's identity from the Bearer token injected by mobileApiClient.
      const response = await mobileApiClient.get<{ payments: unknown[] }>(
        `/api/payments/history`
      );
      return response.payments ?? [];
    } catch (error) {
      logger.error('Failed to fetch user payment history', { error, userId });
      return [];
    }
  }

  static async getJobEscrowTransactions(
    jobId: string
  ): Promise<(EscrowTransactionRow & { jobId: string })[]> {
    try {
      const response = await mobileApiClient.get<{
        escrow: EscrowTransactionRow[];
      }>(`/api/jobs/${jobId}/escrow`);
      return (response.escrow ?? []).map((transaction) => ({
        ...transaction,
        jobId: transaction.job_id,
      }));
    } catch (error) {
      logger.error('Failed to fetch job escrow transactions', { error, jobId });
      return [];
    }
  }
}
