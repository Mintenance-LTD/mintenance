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
  // Real sandbox verification exceeded 40 seconds in CI. Allow up to five
  // minutes, polling gently, while still failing closed on inactive accounts.
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const account = await stripe.accounts.retrieve(id);
    if (
      account.capabilities?.transfers === 'active' &&
      (!requirePayouts || account.payouts_enabled)
    )
      return account;
    await setTimeout(2000);
  }
  throw new Error(
    'Synthetic Connect account did not become ready within five minutes'
  );
}
