import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // SECURITY: Handle CORS preflight with whitelist-based origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
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

    return createCorsResponse(
      req,
      JSON.stringify({
        success: true,
        message: 'Test function works!',
        hasStripeKey: !!stripeKey,
        hasAppUrl: !!appUrl,
        appUrl: appUrl,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('🔴 Error in test function:', error);
    return createCorsResponse(
      req,
      JSON.stringify({ error: String(error) }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
