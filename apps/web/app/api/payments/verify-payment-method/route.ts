import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

// Initialize Stripe with secret key (server-side only)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

const verifyPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized payment method verification attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, verifyPaymentMethodSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { paymentMethodId, customerId } = validation.data;

    // Verify the customer belongs to the authenticated user
    const { data: customer, error: customerError } = await serverSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerError || !customer) {
      logger.warn('Payment method verification for unauthorized customer', {
        service: 'payments',
        userId: user.id,
        customerId
      });
      return NextResponse.json({ error: 'Customer not found or unauthorized' }, { status: 403 });
    }

    // Verify payment method belongs to the customer
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (paymentMethod.customer !== customerId) {
        logger.warn('Payment method does not belong to customer', {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
          customerId,
          actualCustomerId: paymentMethod.customer
        });
        return NextResponse.json({ error: 'Payment method does not belong to customer' }, { status: 403 });
      }

      // Verify payment method is not deleted
      if (paymentMethod.deleted) {
        return NextResponse.json({ error: 'Payment method has been deleted' }, { status: 400 });
      }

      logger.info('Payment method verified successfully', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        customerId
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
        }
      });

    } catch (stripeError) {
      if (stripeError instanceof Stripe.errors.StripeError) {
        logger.warn('Stripe error during payment method verification', {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
          error: stripeError.message
        });
        
        if (stripeError.code === 'resource_missing') {
          return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
        }
        
        return NextResponse.json({ error: stripeError.message }, { status: 400 });
      }
      
      throw stripeError;
    }

  } catch (error) {
    logger.error('Error verifying payment method', error, { service: 'payments' });
    return NextResponse.json(
      { error: 'Failed to verify payment method' },
      { status: 500 }
    );
  }
}
