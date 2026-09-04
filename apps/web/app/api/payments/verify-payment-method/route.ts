import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createPaymentErrorResponse } from '@/lib/errors/payment-errors';

const verifyPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
});

/**
 * POST /api/payments/verify-payment-method
 * Verify a payment method belongs to the authenticated user's Stripe customer
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(
      request,
      verifyPaymentMethodSchema
    );
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId, customerId } = validation.data;

    // Verify the customer belongs to the authenticated user. The payment
    // system stores this relationship on profiles; there is no
    // `stripe_customers` table in the deployed schema.
    const { data: customer, error: customerError } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .eq('stripe_customer_id', customerId)
      .single();

    // PostgREST uses PGRST116 for a legitimate no-row result from `.single()`;
    // only other errors indicate that the ownership check itself could not be
    // trusted.
    if (customerError && customerError.code !== 'PGRST116') {
      logger.error('Failed to verify Stripe customer ownership', customerError, {
        service: 'payments',
        userId: user.id,
      });
      throw new InternalServerError(
        'Could not verify the payment account. Please try again.'
      );
    }

    if (customerError?.code === 'PGRST116' || !customer) {
      logger.warn('Payment method verification for unauthorized customer', {
        service: 'payments',
        userId: user.id,
        customerId,
      });
      throw new ForbiddenError('Customer not found or unauthorized');
    }

    // Verify payment method belongs to the customer
    try {
      const paymentMethod =
        await stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.customer !== customerId) {
        logger.warn('Payment method does not belong to customer', {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
          customerId,
          actualCustomerId: paymentMethod.customer,
        });
        throw new ForbiddenError('Payment method does not belong to customer');
      }

      logger.info('Payment method verified successfully', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        customerId,
      });

      return NextResponse.json({
        valid: true,
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
        },
      });
    } catch (stripeError) {
      if (stripeError instanceof Stripe.errors.StripeError) {
        if (stripeError.code === 'resource_missing') {
          throw new NotFoundError('Payment method not found');
        }

        const response = createPaymentErrorResponse(stripeError, {
          operation: 'verify_payment_method',
          userId: user.id,
        });
        return NextResponse.json(
          {
            error: response.error,
            code: response.code,
            retryable: response.retryable,
          },
          { status: response.status }
        );
      }

      throw stripeError;
    }
  }
);
