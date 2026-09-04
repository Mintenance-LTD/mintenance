import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { stripe } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { createPaymentErrorResponse } from '@/lib/errors/payment-errors';

const paramsSchema = z.object({
  id: z.string().startsWith('pm_', { message: 'Invalid payment method id' }),
});

/**
 * DELETE /api/payments/payment-methods/[id]
 * Detach a payment method from the user's Stripe customer.
 * The payment_method.detached webhook cleans up the local DB row.
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (_request, context) => {
    const parsed = paramsSchema.safeParse(context.params);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid request');
    }
    const { id: paymentMethodId } = parsed.data;
    const { user } = context;

    // Verify ownership before detaching
    const { data: row } = await serverSupabase
      .from('payment_methods')
      .select('user_id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .maybeSingle();

    if (!row) throw new NotFoundError('Payment method not found');
    if (row.user_id !== user.id) {
      throw new ForbiddenError('Cannot delete another user\'s payment method');
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  },
);

/**
 * PATCH /api/payments/payment-methods/[id]
 * Set a payment method as the user's default.
 */
export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (_request, context) => {
    const parsed = paramsSchema.safeParse(context.params);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid request');
    }
    const { id: paymentMethodId } = parsed.data;
    const { user } = context;

    const { data: row } = await serverSupabase
      .from('payment_methods')
      .select('user_id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .maybeSingle();

    if (!row) throw new NotFoundError('Payment method not found');
    if (row.user_id !== user.id) {
      throw new ForbiddenError('Cannot modify another user\'s payment method');
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      throw new NotFoundError('Stripe customer not found');
    }

    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== profile.stripe_customer_id) {
        throw new ForbiddenError('Payment method does not belong to this user');
      }

      await stripe.customers.update(profile.stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
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

    // Keep the local audit mirror aligned after Stripe accepts the change.
    const { error: clearDefaultsError } = await serverSupabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id);

    if (clearDefaultsError) {
      throw new Error('Failed to clear local default payment methods');
    }

    const { error: setDefaultError } = await serverSupabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('stripe_payment_method_id', paymentMethodId);

    if (setDefaultError) {
      throw new Error('Failed to persist local default payment method');
    }

    return NextResponse.json({ success: true });
  },
);
