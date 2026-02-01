import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0';
import { handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // SECURITY: Handle CORS preflight with whitelist-based origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) throw new Error('transactionId is required');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('id, payment_intent_id, amount, payer_id')
      .eq('id', transactionId)
      .single();

    if (txErr || !tx) throw new Error('Escrow transaction not found');
    if (!tx.payment_intent_id) throw new Error('No payment intent recorded for transaction');

    const refund = await stripe.refunds.create({
      payment_intent: tx.payment_intent_id,
      amount: Math.round((tx.amount || 0) * 100), // dollars -> cents
      reason: 'requested_by_customer',
    });

    // Optionally update local state; caller typically updates status after this call
    return createCorsResponse(
      req,
      JSON.stringify({ success: true, refund_id: refund.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error refunding escrow payment:', error);
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

