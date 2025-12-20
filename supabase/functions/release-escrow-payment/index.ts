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

    // Get escrow transaction details with job info
    const { data: transaction, error: transactionError } = await supabase
      .from('escrow_transactions')
      .select('payment_intent_id, amount, payment_type, job_id, payee_id')
      .eq('id', transactionId)
      .single();

    if (transactionError) {
      throw new Error('Transaction not found');
    }

    // Get job details for fee transfer tracking
    const { data: job } = await supabase
      .from('jobs')
      .select('id, contractor_id')
      .eq('id', transaction.job_id)
      .single();

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

    // Calculate fees using same logic as FeeCalculationService
    // Platform fee: 5% with min $0.50, max $50
    const paymentType = transaction.payment_type || 'final';
    const platformFeeRate = 0.05; // 5% for all payment types
    
    let platformFeeDollars = transaction.amount * platformFeeRate;
    platformFeeDollars = Math.max(platformFeeDollars, 0.50); // Minimum $0.50
    platformFeeDollars = Math.min(platformFeeDollars, 50.00); // Maximum $50
    platformFeeDollars = Math.round(platformFeeDollars * 100) / 100; // Round to 2 decimals
    
    // Stripe processing fee: 2.9% + $0.30
    const stripeFeeDollars = Math.round((transaction.amount * 0.029 + 0.30) * 100) / 100;
    
    // Contractor payout (amount after platform fee)
    const contractorAmountDollars = Math.round((transaction.amount - platformFeeDollars) * 100) / 100;
    
    // Convert to cents for Stripe API
    const platformFee = Math.round(platformFeeDollars * 100);
    const contractorAmount = Math.round(contractorAmountDollars * 100);
    
    // Net platform revenue (platform fee minus Stripe costs)
    const netRevenueDollars = Math.round((platformFeeDollars - stripeFeeDollars) * 100) / 100;

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

    // Get charge ID for fee tracking
    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id;

    // Create platform fee transfer record
    const { data: feeTransfer, error: feeTransferError } = await supabase
      .from('platform_fee_transfers')
      .insert({
        escrow_transaction_id: transactionId,
        job_id: transaction.job_id,
        contractor_id: contractorId,
        amount: platformFeeDollars,
        currency: 'usd',
        stripe_processing_fee: stripeFeeDollars,
        net_revenue: netRevenueDollars,
        stripe_payment_intent_id: transaction.payment_intent_id,
        stripe_charge_id: chargeId,
        status: 'transferred', // In Stripe Connect, fees are automatically deducted
      })
      .select()
      .single();

    if (feeTransferError) {
      console.error('Failed to create fee transfer record:', feeTransferError);
      // Don't fail the release if fee tracking fails
    }

    // Update escrow transaction with fee details
    await supabase
      .from('escrow_transactions')
      .update({
        platform_fee: platformFeeDollars,
        contractor_payout: contractorAmountDollars,
        stripe_processing_fee: stripeFeeDollars,
        fee_transfer_status: 'transferred',
        fee_transfer_id: feeTransfer?.id || null,
        fee_transferred_at: new Date().toISOString(),
        payment_type: paymentType,
      })
      .eq('id', transactionId)
      .catch((err) => {
        console.error('Failed to update escrow transaction:', err);
        // Don't fail the release if update fails
      });

    // Create notification for contractor
    await supabase.from('notifications').insert([{
      user_id: contractorId,
      title: 'Payment Released',
      message: `Payment of $${contractorAmountDollars.toFixed(2)} has been released to your account (after ${platformFeeDollars.toFixed(2)} platform fee).`,
      type: 'payment',
      created_at: new Date().toISOString(),
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        originalAmount: transaction.amount,
        contractorAmount: contractorAmountDollars,
        platformFee: platformFeeDollars,
        stripeFee: stripeFeeDollars,
        netRevenue: netRevenueDollars,
        feeTransferId: feeTransfer?.id,
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