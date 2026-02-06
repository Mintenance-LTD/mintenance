import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0';
import { handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';
import { verifyAuth, AuthError, unauthorizedResponse } from '../_shared/auth.ts';

serve(async (req) => {
  // SECURITY: Handle CORS preflight with whitelist-based origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // SECURITY: Verify authentication before processing refund
    const authUser = await verifyAuth(req);

    const { paymentIntentId, amount, reason } = await req.json();

    if (!paymentIntentId) throw new Error('paymentIntentId is required');
    if (typeof amount !== 'number' || amount <= 0) throw new Error('Valid amount is required');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100), // dollars -> cents
      reason: (reason as any) || undefined,
    });

    return createCorsResponse(
      req,
      JSON.stringify({ success: true, refund_id: refund.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(req, error.message);
    }
    console.error('Error processing refund:', error);
    return createCorsResponse(
      req,
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

