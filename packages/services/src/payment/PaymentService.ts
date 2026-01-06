import { BaseService, ServiceConfig } from '../base';
import { User, Job } from '@mintenance/types';

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' |
          'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  client_secret?: string;
  payment_method?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  amount: number;
  jobId: string;
  contractorId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface EscrowTransaction {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed';
  createdAt: string;
  releasedAt?: string;
  metadata?: Record<string, any>;
}

export class PaymentService extends BaseService {
  private apiBaseUrl: string;

  constructor(config: ServiceConfig & { apiBaseUrl?: string }) {
    super(config);
    this.apiBaseUrl = config.apiBaseUrl || config.apiUrl || '';
  }

  /**
   * Create a payment intent for a job payment (shared logic)
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId: params.jobId,
          amount: params.amount,
          contractorId: params.contractorId,
          paymentMethodId: params.paymentMethodId,
          metadata: params.metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: data.status,
        client_secret: data.clientSecret || data.client_secret,
        payment_method: data.payment_method,
        metadata: data.metadata,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a setup intent for adding a new payment method
   */
  async createSetupIntent(): Promise<{ clientSecret: string }> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/create-setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create setup intent');
      }

      return { clientSecret: data.clientSecret || data.client_secret };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get payment methods for the current user
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/methods`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      return data.methods || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Save a payment method for future use
   */
  async savePaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/methods/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      return data.method;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete payment method');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get payment history for the current user
   */
  async getPaymentHistory(params?: {
    limit?: number;
    cursor?: string
  }): Promise<{ payments: EscrowTransaction[]; nextCursor?: string }> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);

      const queryString = searchParams.toString();
      const response = await fetch(
        `${this.apiBaseUrl}/api/payments/history${queryString ? `?${queryString}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load payment history');
      }

      return {
        payments: data.payments || [],
        nextCursor: data.nextCursor
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create escrow for a job payment
   */
  async createEscrow(
    jobId: string,
    amount: number,
    contractorId: string
  ): Promise<EscrowTransaction> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token || !session.session.user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId,
          amount,
          contractorId,
          payerId: session.session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create escrow');
      }

      return data.escrow;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Release escrow funds to contractor
   */
  async releaseEscrow(escrowId: string): Promise<EscrowTransaction> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/payments/escrow/${escrowId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release escrow');
      }

      return data.escrow;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate platform fees for a payment amount
   */
  calculateFees(amount: number): {
    platformFee: number;
    processingFee: number;
    contractorReceives: number;
    total: number;
  } {
    const platformFeePercent = 0.15; // 15% platform fee
    const stripePercent = 0.029; // 2.9% Stripe fee
    const stripeFixed = 0.30; // 30 cents Stripe fixed fee

    const platformFee = amount * platformFeePercent;
    const processingFee = (amount * stripePercent) + stripeFixed;
    const contractorReceives = amount - platformFee;
    const total = amount + processingFee;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      processingFee: Math.round(processingFee * 100) / 100,
      contractorReceives: Math.round(contractorReceives * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}