import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { logger } from '@mintenance/shared';

const StepSchema = z.object({
  id: z.string().uuid(),
  operation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  lease_token: z.string().uuid(),
  kind: z.enum(['auth_user', 'stripe_subscription']),
  resource_id: z.string(),
});
const stripeOptions = { timeout: 10000, maxNetworkRetries: 0 };
class OwnershipReview extends Error {}
function missingStripeResource(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number } | null;
  return e?.code === 'resource_missing' && e.statusCode === 404;
}

async function performStep(step: z.infer<typeof StepSchema>): Promise<void> {
  if (step.kind === 'auth_user') {
    if (step.resource_id !== step.user_id)
      throw new OwnershipReview('Credential identity mismatch');
    const { data, error } = await serverSupabase.auth.admin.deleteUser(
      step.user_id
    );
    if (error?.code === 'user_not_found') return;
    if (error) throw new Error('Credential deletion unconfirmed');
    if (data?.user?.id !== step.user_id) {
      const verification = await serverSupabase.auth.admin.getUserById(
        step.user_id
      );
      if (verification.error?.code !== 'user_not_found')
        throw new Error('Credential deletion unconfirmed');
    }
    return;
  }
  if (!/^sub_[A-Za-z0-9_]+$/.test(step.resource_id))
    throw new OwnershipReview('Invalid subscription reference');
  try {
    const subscription = await stripe.subscriptions.retrieve(
      step.resource_id,
      {},
      stripeOptions
    );
    if (subscription.id !== step.resource_id)
      throw new OwnershipReview('Subscription identity mismatch');
    // These are the server-written owner keys used by all three subscription creators.
    // Stored database IDs may predate the client-write revocation, so they are insufficient proof.
    const owners = ['userId', 'contractorId', 'homeownerId']
      .map((key) => subscription.metadata?.[key])
      .filter(Boolean);
    if (!owners.length || owners.some((owner) => owner !== step.user_id))
      throw new OwnershipReview('Subscription ownership requires review');
    if (subscription.status === 'canceled') return;
    const canceled = await stripe.subscriptions.cancel(
      step.resource_id,
      {},
      stripeOptions
    );
    if (canceled.id !== step.resource_id || canceled.status !== 'canceled')
      throw new Error('Subscription cancellation unconfirmed');
  } catch (error) {
    if (missingStripeResource(error)) return;
    throw error;
  }
}

export async function runAccountDeletionCleanup(
  options: { operationId?: string; maxSteps?: number; budgetMs?: number } = {}
) {
  const deadline = Date.now() + (options.budgetMs ?? 45000);
  const limit = Math.min(Math.max(options.maxSteps ?? 4, 1), 10);
  const result = { completed: 0, retried: 0, needsReview: 0 };
  for (let i = 0; i < limit && Date.now() < deadline - 20000; i++) {
    const { data, error } = await serverSupabase.rpc(
      'claim_account_cleanup_step',
      { p_operation_id: options.operationId ?? null }
    );
    if (error) throw new Error('Unable to claim account cleanup');
    if (!data) break;
    const step = StepSchema.parse(data);
    let outcome: 'completed' | 'retry' | 'needs_review' = 'completed';
    try {
      await performStep(step);
    } catch (error) {
      outcome = error instanceof OwnershipReview ? 'needs_review' : 'retry';
      logger.error('Account cleanup requires follow-up', {
        service: 'account-deletion',
        stepId: step.id,
        outcome,
      });
    }
    const { error: finishError } = await serverSupabase.rpc(
      'finish_account_cleanup_step',
      {
        p_step_id: step.id,
        p_lease_token: step.lease_token,
        p_outcome: outcome,
      }
    );
    // A lost write or expired lease leaves durable work. Never claim completion from provider success alone.
    if (finishError)
      throw new Error('Unable to persist account cleanup outcome');
    if (outcome === 'completed') result.completed++;
    else if (outcome === 'retry') result.retried++;
    else result.needsReview++;
  }
  return result;
}

export async function getAccountDeletionStatus(
  operationId: string
): Promise<'completed' | 'pending' | 'needs_review'> {
  const { data, error } = await serverSupabase
    .from('account_deletion_cleanup_steps')
    .select('status')
    .eq('operation_id', operationId);
  if (error || !data?.length)
    throw new Error('Unable to confirm account cleanup status');
  if (data.some((step) => step.status === 'needs_review'))
    return 'needs_review';
  return data.every((step) => step.status === 'completed')
    ? 'completed'
    : 'pending';
}
