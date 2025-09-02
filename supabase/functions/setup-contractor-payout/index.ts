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
    const { contractorId } = await req.json();

    // Initialize Stripe and Supabase
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get contractor information
    const { data: contractor, error: contractorError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (contractorError) {
      throw new Error('Contractor not found');
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: contractor.email,
      metadata: {
        contractor_id: contractorId,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: contractor.email,
        first_name: contractor.first_name,
        last_name: contractor.last_name,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get('APP_URL')}/contractor/payout/refresh`,
      return_url: `${Deno.env.get('APP_URL')}/contractor/payout/success`,
      type: 'account_onboarding',
    });

    // Save to database
    const { error: dbError } = await supabase
      .from('contractor_payout_accounts')
      .insert([{
        contractor_id: contractorId,
        stripe_account_id: account.id,
        account_complete: false,
      }]);

    if (dbError) {
      // If account already exists, update it
      await supabase
        .from('contractor_payout_accounts')
        .update({
          stripe_account_id: account.id,
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', contractorId);
    }

    return new Response(
      JSON.stringify({
        accountId: account.id,
        accountUrl: accountLink.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error setting up contractor payout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});