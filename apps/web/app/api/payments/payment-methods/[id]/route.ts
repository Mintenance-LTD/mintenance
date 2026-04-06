import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { stripe } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors/api-error';

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

    // Clear existing default + set new default (two-step for simplicity)
    await serverSupabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id);
    await serverSupabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('stripe_payment_method_id', paymentMethodId);

    return NextResponse.json({ success: true });
  },
);
