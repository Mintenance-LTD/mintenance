import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { handleAPIError, UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/payments/methods
 * Retrieve all payment methods for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for payment endpoints
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.payment);
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required to view payment methods');
    }

    // Get user profile (stripe_customer_id column may not exist yet)
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      logger.error('Payment methods: profiles query failed', {
        service: 'payments',
        userId: user.id,
        userEmail: user.email,
        errorCode: userError?.code,
        errorMessage: userError?.message,
        errorHint: userError?.hint,
        hasData: !!userData,
      });
      throw new NotFoundError('User');
    }

    // Try to get stripe_customer_id (column may not exist in DB schema)
    let stripeCustomerId: string | null = null;
    const { data: stripeData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (stripeData) {
      stripeCustomerId = (stripeData as Record<string, unknown>).stripe_customer_id as string | null;
    }

    // If not in DB, search Stripe by email to avoid creating duplicates
    if (!stripeCustomerId) {
      const existing = await stripe.customers.list({ email: userData.email, limit: 1 });
      stripeCustomerId = existing.data[0]?.id || null;
    }

    // Create Stripe customer if not found anywhere
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // Best-effort save to DB (column may not exist)
    await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    // Check if customer is deleted
    if ((customer as Stripe.DeletedCustomer).deleted) {
      throw new BadRequestError('Stripe customer deleted');
    }

    const stripeCustomer = customer as Stripe.Customer;
    const defaultPaymentMethodId = stripeCustomer.invoice_settings?.default_payment_method
      ? (typeof stripeCustomer.invoice_settings.default_payment_method === 'string'
        ? stripeCustomer.invoice_settings.default_payment_method
        : stripeCustomer.invoice_settings.default_payment_method.id)
      : null;

    // Retrieve payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Format payment methods for response
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      isDefault: pm.id === defaultPaymentMethodId,
      card: pm.card
        ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        }
        : null,
      billing_details: pm.billing_details,
      created: pm.created,
    }));

    logger.info('Payment methods retrieved', {
      service: 'payments',
      userId: user.id,
      methodCount: formattedMethods.length,
      defaultPaymentMethodId,
    });

    const response = NextResponse.json({
      paymentMethods: formattedMethods,
      stripeCustomerId,
      defaultPaymentMethodId,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIGS.payment.uniqueTokenPerInterval.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;
  } catch (error) {
    return handleAPIError(error);
  }
}
