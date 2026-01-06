import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

interface PaymentMethod {
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

interface CreatePaymentIntentResponse {
  clientSecret?: string;
  error?: string;
}

interface CreateSetupIntentResponse {
  setupIntentClientSecret?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Create a payment intent for a job payment
   */
  static async createPaymentIntent(
    jobId: string,
    amount: number,
    paymentMethodId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId,
          amount,
          paymentMethodId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      return { clientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, jobId, amount });
      return { error: error instanceof Error ? error.message : 'Failed to create payment' };
    }
  }

  /**
   * Create a setup intent for adding a new payment method
   */
  static async createSetupIntent(): Promise<CreateSetupIntentResponse> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/create-setup-intent`, {
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

      return { setupIntentClientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create setup intent', { error });
      return { error: error instanceof Error ? error.message : 'Failed to setup payment method' };
    }
  }

  /**
   * Save a payment method to the user's account
   */
  static async savePaymentMethod(
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/save-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          paymentMethodId,
          setAsDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      logger.info('Payment method saved successfully', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to save payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save payment method',
      };
    }
  }

  /**
   * Get user's saved payment methods
   */
  static async getPaymentMethods(): Promise<{
    methods?: PaymentMethod[];
    error?: string;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/methods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      return { methods: data.methods };
    } catch (error) {
      logger.error('Failed to fetch payment methods', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment methods' };
    }
  }

  /**
   * Delete a payment method
   */
  static async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete payment method');
      }

      logger.info('Payment method deleted successfully', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method',
      };
    }
  }

  /**
   * Set a payment method as default
   */
  static async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/methods/${paymentMethodId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }

      logger.info('Default payment method updated', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to set default payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default payment method',
      };
    }
  }

  /**
   * Process a payment for a job (with 3D Secure support)
   */
  static async processJobPayment(
    jobId: string,
    amount: number,
    paymentMethodId: string,
    saveForFuture: boolean = false
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    requiresAction?: boolean;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/process-job-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId,
          amount,
          paymentMethodId,
          saveForFuture,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      // Check if 3D Secure is required
      if (data.requiresAction) {
        logger.info('Payment requires 3D Secure authentication', { jobId });
        return {
          success: false,
          requiresAction: true,
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
        };
      }

      logger.info('Payment processed successfully', { jobId, amount });
      return {
        success: true,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (error) {
      logger.error('Failed to process job payment', { error, jobId, amount });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  /**
   * Get payment history for a user
   */
  static async getPaymentHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    payments?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/payments/history?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment history');
      }

      return {
        payments: data.payments,
        total: data.total,
      };
    } catch (error) {
      logger.error('Failed to fetch payment history', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment history' };
    }
  }

  /**
   * Request a refund for a payment
   */
  static async requestRefund(
    paymentId: string,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request refund');
      }

      logger.info('Refund requested successfully', { paymentId, refundId: data.refundId });
      return {
        success: true,
        refundId: data.refundId,
      };
    } catch (error) {
      logger.error('Failed to request refund', { error, paymentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request refund',
      };
    }
  }
}