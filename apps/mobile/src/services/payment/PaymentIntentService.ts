import type { z } from 'zod';
import {
  paymentIntentRequestSchema,
  type PaymentIntentRequest,
} from '@mintenance/api-contracts';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { apiRequest } from './apiHelper';
import type {
  CreatePaymentIntentResponse,
  CreateSetupIntentResponse,
} from './types';

/**
 * Build + validate the create-intent request body against the SHARED
 * api-contract (audit 2026-07-27). Two protections in one place:
 *
 *  - COMPILE TIME: the literal below carries `satisfies z.input<…>`, so if
 *    the shared contract gains a required field (the 2026-05-23 audit-19 P1
 *    was exactly this — contractorId became required and mobile silently
 *    400'd at the boundary), mobile stops COMPILING instead of failing in
 *    production.
 *  - RUNTIME: safeParse rejects invalid values (bad UUIDs, amount over the
 *    shared server validator cap) with a readable message BEFORE the
 *    network call, mirroring the server's validator exactly.
 *
 * `.passthrough()` keeps `paymentMethodId` — a compat key shipped mobile
 * builds send and the server's schema tolerates (B2 strict rollout note in
 * apps/web/lib/validation/schemas-payment.ts).
 *
 * Exported for the schema-drift contract test.
 */
export function buildCreateIntentBody(input: {
  jobId: string;
  amount: number;
  contractorId: string;
  paymentMethodId?: string;
}): PaymentIntentRequest & { paymentMethodId?: string } {
  const candidate = {
    jobId: input.jobId,
    amount: input.amount,
    contractorId: input.contractorId,
    ...(input.paymentMethodId
      ? { paymentMethodId: input.paymentMethodId }
      : {}),
  } satisfies z.input<typeof paymentIntentRequestSchema> & {
    paymentMethodId?: string;
  };

  const result = paymentIntentRequestSchema.passthrough().safeParse(candidate);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      `Invalid payment request${first ? `: ${first.path.join('.')} ${first.message}` : ''}`
    );
  }
  return result.data as PaymentIntentRequest & { paymentMethodId?: string };
}

/** Retry API calls on transient network/server errors with exponential backoff. */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isTransientError(lastError) || attempt === maxAttempts)
        throw lastError;
      await new Promise((r) =>
        setTimeout(r, delayMs * Math.pow(2, attempt - 1))
      );
      logger.warn(
        'PaymentIntentService',
        `Retry attempt ${attempt}: ${lastError.message}`
      );
    }
  }
  throw lastError!;
}

function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('429')
  );
}

/**
 * Build a stable idempotency key for a single payment attempt.
 *
 * The server's create-intent route reads the `Idempotency-Key` header
 * (getIdempotencyKeyFromRequest) to dedupe duplicate payment-intent creation
 * — without it, the server mints a fresh random key per request and the
 * internal dedup (which guards against double-spending referral credit) never
 * fires. Generate ONE key per attempt and reuse it across every network retry
 * so a double-tap / transient-error retry resolves to the same escrow record.
 *
 * A cryptographically-strong UUID isn't required here (this only needs to be
 * unique per attempt and stable across its retries), so we avoid pulling in a
 * uuid dependency and derive one from the job id + time + entropy. Hermes has
 * no `crypto.randomUUID`.
 */
function makeIdempotencyKey(jobId: string): string {
  const entropy = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `create_payment_intent:${jobId}:${entropy}`;
}

export class PaymentIntentService {
  static async initializePayment({
    amount,
    jobId,
    contractorId,
  }: {
    amount: number;
    jobId: string;
    contractorId: string;
  }): Promise<{ client_secret: string }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      // Audit 2026-07-27: body validated against the shared api-contract.
      // (This also replaces the previous £100,000 local cap, which
      // contradicted the server validator's £10,000 limit — anything over
      // £10k was already 400ing server-side; now it fails fast with the
      // same message the server would give.)
      const body = buildCreateIntentBody({ amount, jobId, contractorId });
      // One key for the whole attempt — reused across every withRetry pass so
      // a retried create-intent dedupes to the same escrow record server-side.
      const idempotencyKey = makeIdempotencyKey(jobId);
      const data = await withRetry(() =>
        apiRequest<{ clientSecret: string }>('/api/payments/create-intent', {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': idempotencyKey },
        })
      );
      return { client_secret: data.clientSecret };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize payment', { error: errorInstance });
      throw errorInstance;
    }
  }

  static async createPaymentIntent(
    jobId: string,
    amount: number,
    paymentMethodId?: string,
    contractorId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      // Use the API contract read rather than a direct Supabase query here.
      // A designated payer is authorized by the server route but is not the
      // contract's `homeowner_id`; a direct client query can therefore be
      // filtered by contracts RLS before the payment request is reached.
      const { contracts } = await apiRequest<{
        contracts?: Array<{ status?: string }>;
      }>(`/api/contracts?job_id=${encodeURIComponent(jobId)}`, {
        method: 'GET',
      });
      const contract = contracts?.find((item) => item.status === 'accepted');

      if (!contract) {
        throw new Error(
          'Contract must be signed by both parties before payment'
        );
      }

      // 2026-05-23 audit-19 P1: paymentIntentSchema marks contractorId
      // as required. The previous body (jobId/amount/paymentMethodId only)
      // hit the validator 400 before any Stripe call, so the escrow funding
      // step silently failed at the API boundary. The caller already has
      // contractorId in scope (usePayment options) — thread it through so
      // the server can resolve payee_id without re-querying jobs.
      if (!contractorId) {
        throw new Error('Contractor ID is required to fund this job');
      }

      // Audit 2026-07-27: body validated against the shared api-contract —
      // a renamed/missing required field now fails typecheck (satisfies
      // z.input) and invalid values fail here with a readable message
      // instead of a silent 400 at the API boundary.
      const body = buildCreateIntentBody({
        jobId,
        amount,
        contractorId,
        paymentMethodId,
      });

      // 2026-05-26 audit-53 P1: the server response includes
      // paymentIntentId + escrowTransactionId in addition to
      // clientSecret. usePayment.handlePayment needs paymentIntentId
      // to POST /api/payments/confirm-intent — the route that flips
      // escrow from 'pending' to 'held' (route requires a strict body
      // shape { paymentIntentId, jobId }). Surfacing it from the
      // service is cheaper than re-parsing pi_xxx out of the
      // clientSecret string at the call site.
      const data = await apiRequest<{
        clientSecret: string;
        paymentIntentId?: string;
        escrowTransactionId?: string;
      }>('/api/payments/create-intent', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': makeIdempotencyKey(jobId) },
      });

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        escrowTransactionId: data.escrowTransactionId,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, jobId, amount });
      return {
        error:
          error instanceof Error ? error.message : 'Failed to create payment',
      };
    }
  }

  static async createSetupIntent(): Promise<CreateSetupIntentResponse> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const data = await apiRequest<{ clientSecret: string }>(
        '/api/payments/create-setup-intent',
        { method: 'POST' }
      );

      return { setupIntentClientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create setup intent', { error });
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to setup payment method',
      };
    }
  }
}
