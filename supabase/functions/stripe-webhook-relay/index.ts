import Stripe from 'npm:stripe@22.3.2';
import { createRelay } from './handler.ts';

// Verification uses only the endpoint signing secret. No Stripe API request is made.
const stripe = new Stripe('sk_test_verification_only');
const cryptoProvider = Stripe.createSubtleCryptoProvider();
Deno.serve(createRelay({
  signingSecret: Deno.env.get('STRIPE_RELAY_WEBHOOK_SECRET') ?? '',
  bypassSecret: Deno.env.get('STRIPE_RELAY_VERCEL_BYPASS') ?? '',
  verify: (body, signature, secret) => stripe.webhooks.constructEventAsync(
    body, signature, secret, 300, cryptoProvider,
  ),
  fetch,
}));
