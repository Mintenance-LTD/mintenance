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

  let contractorId: string | undefined;
  
  try {
    const body = await req.json();
    contractorId = body.contractorId;

    // Validate required environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('APP_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    if (!appUrl) {
      throw new Error('APP_URL environment variable is not set');
    }

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }

    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    // Initialize Stripe and Supabase
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get contractor information
    const { data: contractor, error: contractorError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (contractorError) {
      console.error('Contractor lookup error:', contractorError);
      throw new Error(`Contractor not found: ${contractorError.message}`);
    }

    if (!contractor) {
      throw new Error('Contractor data not found');
    }

    if (!contractor.email) {
      throw new Error('Contractor email is required but not found');
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
        first_name: contractor.first_name || 'Contractor',
        last_name: contractor.last_name || 'User',
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/contractor/payout/refresh`,
      return_url: `${appUrl}/contractor/payout/success`,
      type: 'account_onboarding',
    });

    // Save to database - both contractor_payout_accounts and users tables
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

    // Also update users table with stripe_connect_account_id for payment setup checks
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        stripe_connect_account_id: account.id,
      })
      .eq('id', contractorId);

    if (userUpdateError) {
      console.error('Failed to update users.stripe_connect_account_id:', userUpdateError);
      // Don't fail the whole request, but log the error
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error setting up contractor payout:', {
      message: errorMessage,
      error: error,
      contractorId: contractorId || 'unknown',
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: Deno.env.get('ENVIRONMENT') === 'development' ? String(error) : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});