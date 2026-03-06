import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';

export class JobPaymentService {
  static async processJobPayment(
    jobId: string,
    amount: number,
    paymentMethodId: string,
    saveForFuture = false
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    requiresAction?: boolean;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      const data = await mobileApiClient.post<{
        requiresAction?: boolean;
        clientSecret?: string;
        paymentIntentId?: string;
      }>('/api/payments/process-job-payment', {
        jobId,
        amount,
        paymentMethodId,
        saveForFuture,
      });

      if (data.requiresAction || data.clientSecret) {
        logger.info('Payment requires 3D Secure authentication', { jobId });
        return {
          success: false,
          requiresAction: true,
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
        };
      }

      logger.info('Payment processed successfully', { jobId, amount });
      return { success: true, paymentIntentId: data.paymentIntentId };
    } catch (error) {
      logger.error('Failed to process job payment', { error, jobId, amount });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  static async getPaymentHistory(
    userIdOrLimit: string | number = 20,
    statusOrOffset?: string | number,
    offset?: number
  ): Promise<unknown> {
    if (typeof userIdOrLimit === 'string') {
      const userId = userIdOrLimit;
      const status = typeof statusOrOffset === 'string' ? statusOrOffset : undefined;

      const query = supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId);

      if (status) {
        query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch payment history', { error, userId });
        return [];
      }

      return data || [];
    }

    const limit = userIdOrLimit;
    const resolvedOffset = typeof statusOrOffset === 'number' ? statusOrOffset : offset || 0;

    try {
      const data = await mobileApiClient.get<{ payments?: unknown[]; total?: number }>(
        `/api/payments/history?limit=${limit}&offset=${resolvedOffset}`
      );
      return { payments: data.payments, total: data.total };
    } catch (error) {
      logger.error('Failed to fetch payment history', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment history' };
    }
  }

  static async requestRefund(
    paymentId: string,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const history = await JobPaymentService.getPaymentHistory(50, 0) as {
        payments?: Array<{ id: string; jobId: string }>;
      };

      const payment = history.payments?.find((entry) => entry.id === paymentId);
      if (!payment?.jobId) {
        throw new Error('Payment record not found');
      }

      const data = await mobileApiClient.post<{ refundId?: string; id?: string }>(
        '/api/payments/refund',
        { jobId: payment.jobId, escrowTransactionId: paymentId, reason }
      );

      logger.info('Refund requested successfully', { paymentId, refundId: data.refundId || data.id });
      return { success: true, refundId: data.refundId || data.id || paymentId };
    } catch (error) {
      logger.error('Failed to request refund', { error, paymentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request refund',
      };
    }
  }
}
