import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0';
import { handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';
import { verifyAuth, AuthError, unauthorizedResponse } from '../_shared/auth.ts';

serve(async (req) => {
  // SECURITY: Handle CORS preflight with whitelist-based origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // SECURITY: Verify authentication before processing payment
    const authUser = await verifyAuth(req);

    const { amount, currency = 'usd', metadata } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create payment intent with application fee for platform
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      payment_method_types: ['card'],
      capture_method: 'manual', // Manual capture for escrow
      description: `Mintenance Job Payment - Job ID: ${metadata?.jobId}`,
    });

    return createCorsResponse(
      req,
      JSON.stringify({
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(req, error.message);
    }
    console.error('Error creating payment intent:', error);
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