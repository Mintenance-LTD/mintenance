import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { stripeWithTimeout } from '@/lib/utils/api-timeout';
import { InternalServerError } from '@/lib/errors/api-error';
import {
  compareReconciliationFunding,
  type ReconciliationSource,
} from './reconciliation-funding';

export class PaymentReconciliationService {
  /** Each bounded run resumes oldest unchecked work; successful acknowledgements are durable. */
  static async reconcile() {
    const deadline = Date.now() + 25000;
    const results = {
      checked: 0,
      matched: 0,
      mismatched: 0,
      missingInStripe: 0,
      errors: 0,
    };
    const { data: run, error: runError } = await serverSupabase
      .from('payment_reconciliation_runs')
      .insert({ status: 'running' })
      .select('id')
      .single();
    if (runError || !run?.id)
      throw new InternalServerError('Reconciliation run could not be recorded');
    let failure: unknown;
    try {
      while (results.checked < 3 && Date.now() < deadline) {
        const { data: work, error } = await serverSupabase.rpc(
          'claim_payment_reconciliation'
        );
        if (error)
          throw new InternalServerError(
            'Reconciliation work could not be claimed'
          );
        if (!work) break;
        if (
          !work.escrow_id ||
          !work.token ||
          work.source?.id !== work.escrow_id ||
          !work.source.payment_intent_id
        )
          throw new InternalServerError('Reconciliation work is invalid');
        results.checked++;
        let outcome: 'matched' | 'mismatch' | 'missing' | 'error' = 'error';
        let evidence: Record<string, unknown> = {
          reason: 'provider_unavailable',
        };
        try {
          const remaining = Math.min(8000, deadline - Date.now());
          if (remaining <= 0)
            throw new Error('Reconciliation time budget exhausted');
          const intent = await stripeWithTimeout(
            () =>
              stripe.paymentIntents.retrieve(work.source.payment_intent_id, {
                expand: ['latest_charge'],
              }),
            'reconcile-payment',
            remaining,
            0
          );
          const comparison = compareReconciliationFunding(
            work.source as ReconciliationSource,
            intent
          );
          outcome = comparison.matched ? 'matched' : 'mismatch';
          evidence = comparison.evidence;
        } catch (error) {
          // Other invalid-request failures (bad key/account/parameters) do not prove a missing payment.
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'resource_missing'
          ) {
            outcome = 'missing';
            evidence = { mismatch_type: 'missing' };
          }
        }
        const { data: acknowledged, error: acknowledgeError } =
          await serverSupabase.rpc('finish_payment_reconciliation', {
            p_escrow_id: work.escrow_id,
            p_token: work.token,
            p_outcome: outcome,
            p_evidence: evidence,
          });
        if (acknowledgeError)
          throw new InternalServerError(
            'Reconciliation result could not be saved'
          );
        if (acknowledged !== true || outcome === 'error') results.errors++;
        else if (outcome === 'matched') results.matched++;
        else if (outcome === 'missing') results.missingInStripe++;
        else results.mismatched++;
      }
    } catch (error) {
      failure = error;
    }
    const { data: completed, error: completeError } = await serverSupabase
      .from('payment_reconciliation_runs')
      .update({
        completed_at: new Date().toISOString(),
        status: failure || results.errors ? 'failed' : 'completed',
        checked: results.checked,
        matched: results.matched,
        mismatched: results.mismatched,
        missing: results.missingInStripe,
        errors: results.errors + (failure ? 1 : 0),
      })
      .eq('id', run.id)
      .eq('status', 'running')
      .select('id')
      .single();
    if (completeError || completed?.id !== run.id)
      throw new InternalServerError(
        'Reconciliation run completion could not be saved'
      );
    if (failure) throw failure;
    return results;
  }
}
