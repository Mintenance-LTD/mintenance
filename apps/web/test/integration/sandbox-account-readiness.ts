import { setTimeout } from 'node:timers/promises';
import { stripe } from '@/lib/stripe';

/** Stripe activates synthetic Connect capabilities asynchronously. */
export async function waitForSandboxAccount(
  id: string,
  requirePayouts = false
) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Connect readiness polling requires Stripe test mode');
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const account = await stripe.accounts.retrieve(id);
    if (
      account.capabilities?.transfers === 'active' &&
      (!requirePayouts || account.payouts_enabled)
    )
      return account;
    if (attempt < 39) await setTimeout(1000);
  }
  throw new Error(
    'Synthetic Connect account did not become ready within 40 checks'
  );
}
