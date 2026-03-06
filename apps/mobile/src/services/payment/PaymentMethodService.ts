import {
  confirmPayment as stripeConfirmPayment,
  createPaymentMethod as stripeCreatePaymentMethod,
} from '@stripe/stripe-react-native';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { PaymentMethod } from './types';

export class PaymentMethodService {
  static async createPaymentMethod(params: {
    type: 'card';
    card: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: { name?: string; email?: string };
  }): Promise<{ id: string; card?: { last4?: string } }> {
    const { expMonth, expYear } = params.card;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      throw new Error('Card has expired');
    }

    // Cast via unknown: Stripe RN SDK types expect paymentMethodData but raw card tokens
    // are passed for test environments. Runtime behavior is preserved.
    const createParams = {
      paymentMethodType: 'Card',
      card: {
        number: params.card.number,
        expMonth: params.card.expMonth,
        expYear: params.card.expYear,
        cvc: params.card.cvc,
      },
      billingDetails: params.billingDetails,
    } as unknown as Parameters<typeof stripeCreatePaymentMethod>[0];
    const { paymentMethod, error } = await stripeCreatePaymentMethod(createParams);

    if (error || !paymentMethod) {
      throw new Error(error?.message || 'Failed to create payment method');
    }

    return paymentMethod as { id: string; card?: { last4?: string } };
  }

  /** DO NOT wrap with retry — retrying a confirmation creates duplicate charges */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentMethodId: string;
  }): Promise<{ id: string; status: string }> {
    const { paymentIntent, error } = await stripeConfirmPayment(
      params.clientSecret,
      {
        paymentMethodType: 'Card',
        paymentMethodData: { paymentMethodId: params.paymentMethodId },
      }
    );

    if (error || !paymentIntent) {
      throw new Error(error?.message || 'Failed to confirm payment');
    }

    return paymentIntent as { id: string; status: string };
  }

  static async savePaymentMethod(
    paymentMethodId: string,
    setAsDefault = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await mobileApiClient.post('/api/payments/add-method', { paymentMethodId, setAsDefault });
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

  static async getPaymentMethods(): Promise<{ methods?: PaymentMethod[]; error?: string }> {
    try {
      const data = await mobileApiClient.get<{
        paymentMethods?: Array<Record<string, unknown>>;
        methods?: Array<Record<string, unknown>>;
      }>('/api/payments/methods');

      const methods = ((data.paymentMethods || data.methods || []) as Array<{
        id: string;
        type: string;
        isDefault?: boolean;
        created?: number;
        card?: { brand: string; last4: string; expMonth: number; expYear: number } | null;
      }>).map((method) => ({
        id: method.id,
        type: method.type,
        isDefault: !!method.isDefault,
        createdAt: method.created
          ? new Date(method.created * 1000).toISOString()
          : new Date().toISOString(),
        card: method.card
          ? {
              brand: method.card.brand,
              last4: method.card.last4,
              expiryMonth: method.card.expMonth,
              expiryYear: method.card.expYear,
            }
          : undefined,
      })) as PaymentMethod[];

      return { methods };
    } catch (error) {
      logger.error('Failed to fetch payment methods', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment methods' };
    }
  }

  static async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await mobileApiClient.delete('/api/payments/remove-method', {
        body: JSON.stringify({ paymentMethodId }),
      });
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

  static async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await mobileApiClient.post('/api/payments/set-default', { paymentMethodId });
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
}
