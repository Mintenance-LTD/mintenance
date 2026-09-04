import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createPaymentErrorResponse } from '@/lib/errors/payment-errors';

// Audit P2 (2026-05-10): `.strict()` rejects unknown body keys.
const addMethodSchema = z
  .object({
    paymentMethodId: z
      .string()
      .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
    setAsDefault: z.boolean().default(false),
  })
  .strict();

/**
 * POST /api/payments/add-method
 * Attach a payment method to the user's Stripe customer
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, addMethodSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId, setAsDefault } = validation.data;

    // Get user profile
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new NotFoundError('User not found');
    }

    // Try to get stripe_customer_id (column may not exist in DB schema)
    let stripeCustomerId: string | null = null;
    const { data: stripeData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (stripeData) {
      stripeCustomerId = (stripeData as Record<string, unknown>)
        .stripe_customer_id as string | null;
    }

    // If no customer is stored, create one for this user. Do not search by
    // email: Stripe email matches are not an ownership proof and can bind a
    // payment method to another user's customer when emails are shared or
    // stale records exist.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { userId: user.id },
      }, {
        idempotencyKey: `stripe_customer_${user.id}`,
      });
      stripeCustomerId = customer.id;
    }

    // The customer link is required for future payment-method reads and
    // off-session charges. Do not continue as if the operation succeeded if
    // the service-role mirror write fails.
    const { error: customerLinkError } = await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
    if (customerLinkError) {
      logger.error('Failed to persist Stripe customer link', customerLinkError, {
        service: 'payments',
        userId: user.id,
      });

      // Do not leave a newly-created Stripe customer orphaned when the local
      // profile write fails. Only remove customers created in this request;
      // an existing customer ID must never be deleted as a side effect of a
      // failed mirror update.
      if (!stripeData?.stripe_customer_id) {
        try {
          await stripe.customers.del(stripeCustomerId);
        } catch (cleanupError) {
          logger.error('Failed to clean up orphan Stripe customer', cleanupError, {
            service: 'payments',
            userId: user.id,
            stripeCustomerId,
          });
        }
      }
      throw new Error('Failed to save payment account');
    }

    // Attach payment method to customer
    let paymentMethod: Stripe.PaymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        logger.error('Stripe error adding payment method', error, {
          service: 'payments',
        });
        const response = createPaymentErrorResponse(error, {
          operation: 'add_payment_method',
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
      throw error;
    }

    // Set as default payment method if requested
    if (setAsDefault) {
      try {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } catch (error) {
        logger.error('Failed to set Stripe payment method as default', error, {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
        });
        if (error instanceof Stripe.errors.StripeError) {
          const response = createPaymentErrorResponse(error, {
            operation: 'set_default_payment_method',
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
        throw error;
      }
    }

    logger.info('Payment method added successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      isDefault: setAsDefault,
    });

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            }
          : null,
      },
      isDefault: setAsDefault,
    });
  }
);
