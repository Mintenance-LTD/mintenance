import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 Test function invoked');

    const body = await req.json();
    console.log('🔵 Body:', body);

    // Check environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('APP_URL');

    console.log('🔵 Has STRIPE_SECRET_KEY:', !!stripeKey);
    console.log('🔵 Has APP_URL:', !!appUrl);
    console.log('🔵 APP_URL value:', appUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function works!',
        hasStripeKey: !!stripeKey,
        hasAppUrl: !!appUrl,
        appUrl: appUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('🔴 Error in test function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
