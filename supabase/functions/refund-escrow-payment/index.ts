import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Error refunding escrow payment:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});

