import { logger } from '@/lib/logger';
import { PaymentInitialization } from './payment/PaymentInitialization';
import { PaymentConfirmation } from './payment/PaymentConfirmation';
import { EscrowService } from './payment/EscrowService';
import { PayoutService } from './payment/PayoutService';
import { PaymentValidation } from './payment/PaymentValidation';
import type {
  PaymentIntent,
  EscrowTransaction,
  PaymentMethod,
  FeeCalculation
} from '@mintenance/types';

export class PaymentService {
  /**
   * Initialize payment with validation
   */
  static async initializePayment(params: {
    amount: number;
    jobId: string;
    contractorId: string;
  }): Promise<{ client_secret: string }> {
    return PaymentInitialization.initializePayment(params);
  }

  /**
   * Fetch payment history for current user via server API
   */
  static async getPaymentHistory(params?: { limit?: number; cursor?: string }): Promise<{ payments: EscrowTransaction[]; nextCursor?: string }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);

      const queryString = searchParams.toString();
      const resp = await fetch(`/api/payments/history${queryString ? `?${queryString}` : ''}`, {
        credentials: 'same-origin',
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Failed to load payment history: ${body}`);
      }
      const json = (await resp.json()) as { payments?: EscrowTransaction[]; nextCursor?: string };
      return { payments: json.payments ?? [], nextCursor: json.nextCursor };
    } catch (error) {
      logger.error('PaymentService history error', error);
      throw new Error('Failed to load payment history. Please check your connection and try again.');
    }
  }

  /**
   * Confirm payment with Stripe (web-specific implementation)
   */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentElement: unknown;
    returnUrl?: string;
  }): Promise<{ status: PaymentIntent['status']; paymentIntent?: import('./payment/types').StripePaymentIntentPayload }> {
    return PaymentConfirmation.confirmPayment(params);
  }

  /**
   * Create payment method (web-specific)
   */
  static async createPaymentMethod(params: {
    type: string;
    card: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: import('./payment/types').StripeBillingDetails;
  }): Promise<PaymentMethod> {
    return PaymentConfirmation.createPaymentMethod(params);
  }

  /**
   * Create payment intent for job escrow
   */
  static async createJobPayment(
    jobId: string,
    amount: number
  ): Promise<PaymentIntent> {
    const { client_secret } = await PaymentInitialization.initializePayment({
      amount,
      jobId,
      contractorId: '', // Will be set by the caller
    });
    
    return {
      id: `pi_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret,
    };
  }

  /**
   * Create escrow transaction
   */
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<EscrowTransaction> {
    return EscrowService.createEscrowTransaction(jobId, payerId, payeeId, amount);
  }

  /**
   * Hold payment in escrow
   */
  static async holdPaymentInEscrow(
    transactionId: string,
    paymentIntentId: string
  ): Promise<void> {
    return EscrowService.holdPaymentInEscrow(transactionId, paymentIntentId);
  }

  /**
   * Release payment from escrow
   */
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    return EscrowService.releaseEscrowPayment(transactionId);
  }

  /**
   * Refund escrow payment
   */
  static async refundEscrowPayment(
    transactionId: string,
    reason: string = 'Refund requested'
  ): Promise<void> {
    return EscrowService.refundEscrowPayment(transactionId, reason);
  }

  /**
   * Get escrow transactions for a job
   */
  static async getJobEscrowTransactions(
    jobId: string
  ): Promise<EscrowTransaction[]> {
    return EscrowService.getJobEscrowTransactions(jobId);
  }

  /**
   * Get user's payment history
   */
  static async getUserPaymentHistory(
    userId: string
  ): Promise<EscrowTransaction[]> {
    return EscrowService.getUserPaymentHistory(userId);
  }

  /**
   * Calculate fees
   */
  static calculateFees(amount: number): FeeCalculation {
    return PaymentValidation.calculateFees(amount);
  }

  /**
   * Setup contractor payout account (Stripe Connect)
   */
  static async setupContractorPayout(
    contractorId: string
  ): Promise<{ accountUrl: string }> {
    return PayoutService.setupContractorPayout(contractorId);
  }

  /**
   * Get contractor payout status
   */
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    return PayoutService.getContractorPayoutStatus(contractorId);
  }

}
