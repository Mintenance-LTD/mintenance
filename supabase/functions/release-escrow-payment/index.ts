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
    const { transactionId, contractorId, amount } = await req.json();

    // Initialize Stripe and Supabase
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get escrow transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('escrow_transactions')
      .select('payment_intent_id, amount')
      .eq('id', transactionId)
      .single();

    if (transactionError) {
      throw new Error('Transaction not found');
    }

    // Get contractor's Stripe account
    const { data: payoutAccount, error: accountError } = await supabase
      .from('contractor_payout_accounts')
      .select('stripe_account_id, account_complete')
      .eq('contractor_id', contractorId)
      .single();

    if (accountError || !payoutAccount?.account_complete) {
      throw new Error('Contractor payout account not set up or incomplete');
    }

    // Capture the payment intent (this charges the customer)
    const paymentIntent = await stripe.paymentIntents.capture(
      transaction.payment_intent_id
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Failed to capture payment');
    }

    // Calculate platform fee (5% of transaction)
    const platformFee = Math.round(transaction.amount * 100 * 0.05); // 5% fee in cents
    const contractorAmount = Math.round(transaction.amount * 100) - platformFee;

    // Transfer to contractor's account
    const transfer = await stripe.transfers.create({
      amount: contractorAmount,
      currency: 'usd',
      destination: payoutAccount.stripe_account_id,
      metadata: {
        transaction_id: transactionId,
        contractor_id: contractorId,
      },
    });

    // Get escrow payment details for tracking
    const { data: escrowPayment } = await supabase
      .from('escrow_payments')
      .select('id, job_id, amount')
      .eq('payment_intent_id', transaction.payment_intent_id)
      .single();

    // Track transaction fee revenue in payment_tracking
    if (escrowPayment) {
      const transactionAmount = transaction.amount;
      const platformFeeAmount = platformFee / 100; // Convert from cents
      const stripeFeeAmount = transactionAmount * 0.029 + 0.30; // 2.9% + £0.30
      const netRevenue = platformFeeAmount - stripeFeeAmount;

      await supabase
        .from('payment_tracking')
        .insert({
          payment_type: 'transaction_fee',
          contractor_id: contractorId,
          job_id: escrowPayment.job_id,
          escrow_payment_id: escrowPayment.id,
          amount: platformFeeAmount,
          currency: 'gbp',
          platform_fee: platformFeeAmount,
          stripe_fee: stripeFeeAmount,
          net_revenue: netRevenue > 0 ? netRevenue : 0,
          status: 'completed',
          stripe_payment_intent_id: transaction.payment_intent_id,
          stripe_charge_id: paymentIntent.latest_charge as string,
          completed_at: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('Failed to track transaction fee:', err);
          // Don't fail the release if tracking fails
        });
    }

    // Create notification for contractor
    await supabase.from('notifications').insert([{
      user_id: contractorId,
      title: 'Payment Released',
      message: `Payment of $${(contractorAmount / 100).toFixed(2)} has been released to your account.`,
      type: 'payment',
      created_at: new Date().toISOString(),
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        contractorAmount: contractorAmount / 100,
        platformFee: platformFee / 100,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error releasing escrow payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});