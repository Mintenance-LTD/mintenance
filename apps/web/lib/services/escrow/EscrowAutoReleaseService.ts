/**
 * Escrow Auto-Release Service
 *
 * Extracted from cron/escrow-auto-release route handler.
 * Processes eligible escrows for automatic release: evaluates conditions,
 * calculates fees, transfers to contractor via Stripe, and updates records.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { notifyAutoRelease } from './escrow-release-notifications';
import {
  getChargeId,
  notifyMissingStripeAccount,
  blockEscrow,
  fetchContractorStripeAccounts,
} from './escrow-release-helpers';
import {
  FeeCalculationService,
  type PaymentType,
} from '@/lib/services/payment/FeeCalculationService';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
// Audit P2 (2026-05-10): use the centralised `stripe` proxy from
// `lib/stripe.ts` so this service inherits the canonical API version
// (currently '2025-01-27.acacia'). The previous local construction
// pinned '2024-04-10' and was ~9 months behind the rest of the
// platform — risk of subtle behavioural drift on transfers.create /
// paymentIntents.capture / accounts.retrieve responses.
import { stripe } from '@/lib/stripe';

const ESCROW_BATCH_LIMIT = 50;

interface AutoReleaseResults {
  evaluated: number;
  released: number;
  errors: number;
  delayed: number;
}

interface EligibleEscrow {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number | null;
  status: string;
  payment_type: string | null;
  payment_intent_id: string | null;
  metadata: Record<string, unknown> | null;
  auto_release_enabled: boolean;
  auto_release_date: string | null;
  admin_hold_status: string;
  homeowner_approval: boolean;
  cooling_off_ends_at: string | null;
  jobs: {
    id: string;
    status: string;
    contractor_id: string;
    homeowner_id: string;
    title: string;
  } | null;
}

export class EscrowAutoReleaseService {
  /**
   * Process all eligible escrows for auto-release.
   */
  static async processAutoReleases(): Promise<AutoReleaseResults> {
    const results: AutoReleaseResults = {
      evaluated: 0,
      released: 0,
      errors: 0,
      delayed: 0,
    };

    const now = new Date();

    // Fetch eligible escrows
    const { data: eligibleEscrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id, job_id, payer_id, payee_id, amount, status,
        payment_type, payment_intent_id, metadata,
        auto_release_enabled, auto_release_date,
        admin_hold_status, homeowner_approval, cooling_off_ends_at,
        jobs (id, status, contractor_id, homeowner_id, title)
      `
      )
      .eq('status', 'held')
      .eq('auto_release_enabled', true)
      .in('admin_hold_status', ['none', 'admin_approved'])
      .lte('auto_release_date', now.toISOString())
      .limit(ESCROW_BATCH_LIMIT);

    if (fetchError) {
      logger.error('Error fetching eligible escrows', {
        service: 'EscrowAutoReleaseService',
        error: fetchError.message,
      });
      throw new Error('Failed to fetch eligible escrows');
    }

    if (!eligibleEscrows || eligibleEscrows.length === 0) {
      return results;
    }

    // Pre-fetch contractor Stripe accounts to avoid N+1 queries
    const contractorStripeMap = await fetchContractorStripeAccounts(
      (eligibleEscrows as unknown as EligibleEscrow[])
        .map((e) => e.payee_id)
        .filter((id): id is string => Boolean(id))
    );

    // Process each escrow
    for (const rawEscrow of eligibleEscrows) {
      const escrow = rawEscrow as unknown as EligibleEscrow;

      try {
        results.evaluated++;

        const job = escrow.jobs;
        if (!job || job.status !== 'completed') continue;

        // Skip admin-held escrows
        if (
          escrow.admin_hold_status === 'admin_hold' ||
          escrow.admin_hold_status === 'pending_review'
        ) {
          continue;
        }

        // Skip if cooling-off period not passed
        if (
          escrow.cooling_off_ends_at &&
          new Date(escrow.cooling_off_ends_at) > now
        ) {
          continue;
        }

        // Evaluate auto-release conditions
        const evaluation = await EscrowReleaseAgent.evaluateAutoRelease(
          escrow.id
        );
        if (!evaluation || !evaluation.success) {
          if (evaluation?.message?.includes('delayed')) {
            results.delayed++;
          }
          continue;
        }

        // Process the release
        const released = await this.releaseEscrow(
          escrow,
          job,
          contractorStripeMap
        );
        if (released) {
          results.released++;
        } else {
          results.errors++;
        }
      } catch (error) {
        logger.error('Error processing escrow auto-release', error, {
          service: 'EscrowAutoReleaseService',
          escrowId: escrow.id,
        });
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Execute the Stripe transfer and update escrow records.
   */
  private static async releaseEscrow(
    escrow: EligibleEscrow,
    job: NonNullable<EligibleEscrow['jobs']>,
    contractorStripeMap: Map<string, string>
  ): Promise<boolean> {
    // LFC-P1-1: the payee is locked at escrow creation in payee_id.
    // If the job's contractor has been reassigned since, funds must NOT
    // follow the new contractor — they must go to the original payee (or
    // be blocked and reviewed). Reject the release if they diverged.
    if (!escrow.payee_id) {
      await blockEscrow(escrow.id, 'missing_payee_id');
      return false;
    }
    if (escrow.payee_id !== job.contractor_id) {
      logger.error(
        'Escrow payee_id does not match current job.contractor_id — blocking release',
        {
          service: 'EscrowAutoReleaseService',
          escrowId: escrow.id,
          jobId: job.id,
          escrowPayeeId: escrow.payee_id,
          jobContractorId: job.contractor_id,
        }
      );
      await blockEscrow(escrow.id, 'payee_contractor_mismatch');
      return false;
    }

    const contractorStripeAccountId = contractorStripeMap.get(escrow.payee_id);

    if (!contractorStripeAccountId) {
      await notifyMissingStripeAccount(escrow, job);
      return false;
    }

    // Calculate fees.
    //
    // 2026-05-27 whole-app review Critical #1: resolve the contractor's
    // tier ONCE at the top of the release flow and thread it through
    // every fee-affecting call (calculateFees here + both
    // transferPlatformFee calls below). Previously this site computed
    // the breakdown with the default 12% rate, then updated
    // escrow_transactions.platform_fee + contractor_payout from THAT
    // breakdown — so Pro / Business contractors were over-charged on
    // both the escrow row AND the platform_fee_transfers row. Manual
    // release-escrow already does this; the cron path didn't.
    const paymentType = (escrow.payment_type as PaymentType) || 'final';
    const contractorTier = await FeeCalculationService.resolveContractorTier(
      escrow.payee_id
    );
    const feeBreakdown = FeeCalculationService.calculateFees(
      escrow.amount || 0,
      { paymentType, contractorTier }
    );
    const contractorAmountCents = Math.round(
      feeBreakdown.contractorAmount * 100
    );

    // 2026-07-10 audit P1 — claim the row atomically BEFORE any irreversible
    // Stripe work. The manual release path (api/payments/release-escrow) has
    // always done this via a compare-and-swap; the cron path did not. So a
    // homeowner clicking "Release Payment" while this hourly cron processed the
    // same escrow — or two overlapping cron invocations — could each pass the
    // read-time `held` check and issue a SECOND stripe.transfers.create,
    // double-paying the contractor from the platform balance. Flipping
    // held -> release_pending here is the CAS: exactly one worker wins the
    // update; the loser matches 0 rows and bails without transferring.
    const { data: claimed, error: claimError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'release_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow.id)
      .eq('status', 'held')
      .select('id');

    if (claimError) {
      logger.error('Failed to claim escrow for auto-release', {
        service: 'EscrowAutoReleaseService',
        escrowId: escrow.id,
        error: claimError.message,
      });
      return false;
    }
    if (!claimed || claimed.length === 0) {
      // Another release path (manual route or a concurrent cron run) already
      // claimed this escrow. Not an error — just skip it this pass.
      logger.info('Escrow already claimed by another release path — skipping', {
        service: 'EscrowAutoReleaseService',
        escrowId: escrow.id,
      });
      return false;
    }

    // Accumulation mode: skip direct transfer, credit the payout balance.
    // The weekly cron (/api/cron/contractor-payouts) will issue the Stripe
    // transfer once the contractor's pending balance crosses the threshold.
    // See docs/STRIPE_CONNECT_INTEGRATION.md for the weekly payout model.
    if (process.env.ESCROW_USE_PAYOUT_ACCUMULATION === 'true') {
      const { accumulateEarnings } =
        await import('@/lib/stripe/connect/payouts');
      await accumulateEarnings({
        contractorId: escrow.payee_id,
        amountMinor: contractorAmountCents,
        currency: 'GBP',
        jobId: job.id,
      });

      // Still need to track platform fee + update escrow even though we
      // didn't transfer now. The fee-transfer is handled on actual payout.
      const chargeIdAcc = await getChargeId(escrow.payment_intent_id);
      let feeTransferResultAcc;
      try {
        feeTransferResultAcc = await FeeTransferService.transferPlatformFee({
          escrowTransactionId: escrow.id,
          jobId: job.id,
          contractorId: escrow.payee_id,
          amount: escrow.amount || 0,
          paymentIntentId: escrow.payment_intent_id || '',
          chargeId: chargeIdAcc,
          paymentType,
          contractorTier, // audit: thread tier through to fee-transfer record
        });
      } catch (error) {
        logger.error(
          'Failed to create fee transfer record (accumulation mode)',
          error,
          {
            service: 'EscrowAutoReleaseService',
            escrowId: escrow.id,
          }
        );
      }

      const { error: accUpdateErr } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'completed',
          released_at: new Date().toISOString(),
          release_reason: 'auto_release_accumulated',
          updated_at: new Date().toISOString(),
          // transfer_id intentionally null — will be set by weekly payout
          platform_fee: feeBreakdown.platformFee,
          contractor_payout: feeBreakdown.contractorAmount,
          stripe_processing_fee: feeBreakdown.stripeFee,
          fee_transfer_status: feeTransferResultAcc?.status || 'pending',
          fee_transfer_id: feeTransferResultAcc?.feeTransferId || null,
          metadata: {
            ...(typeof escrow.metadata === 'object' && escrow.metadata
              ? escrow.metadata
              : {}),
            auto_released: true,
            auto_released_at: new Date().toISOString(),
            payout_mode: 'accumulated',
          },
        })
        .eq('id', escrow.id)
        .eq('status', 'release_pending');

      if (accUpdateErr) {
        logger.error('Failed to update escrow after accumulated release', {
          service: 'EscrowAutoReleaseService',
          escrowId: escrow.id,
          error: accUpdateErr,
        });
        return false;
      }

      logger.info('Escrow auto-released via accumulation mode', {
        service: 'EscrowAutoReleaseService',
        escrowId: escrow.id,
        contractorId: job.contractor_id,
        amountMinor: contractorAmountCents,
      });
      await notifyAutoRelease({
        escrowId: escrow.id,
        jobId: job.id,
        jobTitle: job.title,
        contractorId: escrow.payee_id,
        homeownerId: job.homeowner_id,
        contractorAmount: feeBreakdown.contractorAmount,
        mode: 'accumulated',
      });
      return true;
    }

    // Direct-transfer mode (default): create Stripe transfer immediately.
    // The escrow id is used as the Stripe idempotency key so that even if this
    // code path is somehow entered twice for the same escrow, Stripe returns
    // the original transfer instead of creating a second one (defence in depth
    // on top of the DB claim above).
    const transfer = await stripe.transfers.create(
      {
        amount: contractorAmountCents,
        currency: 'gbp',
        destination: contractorStripeAccountId,
        description: `Auto-release: ${job.title}`,
        metadata: {
          jobId: job.id,
          escrowId: escrow.id,
          homeownerId: job.homeowner_id,
          contractorId: escrow.payee_id,
          releaseReason: 'auto_release',
          platformFee: feeBreakdown.platformFee.toString(),
          contractorAmount: feeBreakdown.contractorAmount.toString(),
        },
      },
      { idempotencyKey: `escrow_auto_release_${escrow.id}` }
    );

    // Track platform fee
    const chargeId = await getChargeId(escrow.payment_intent_id);
    let feeTransferResult;
    try {
      feeTransferResult = await FeeTransferService.transferPlatformFee({
        escrowTransactionId: escrow.id,
        jobId: job.id,
        contractorId: escrow.payee_id,
        amount: escrow.amount || 0,
        paymentIntentId: escrow.payment_intent_id || '',
        chargeId,
        paymentType,
        contractorTier, // audit: thread tier through to fee-transfer record
      });
    } catch (error) {
      logger.error(
        'Failed to create fee transfer record in auto-release',
        error,
        {
          service: 'EscrowAutoReleaseService',
          escrowId: escrow.id,
        }
      );
    }

    // Update escrow record
    const updateData: Record<string, unknown> = {
      status: 'completed',
      released_at: new Date().toISOString(),
      release_reason: 'auto_release',
      updated_at: new Date().toISOString(),
      transfer_id: transfer.id,
      platform_fee: feeBreakdown.platformFee,
      contractor_payout: feeBreakdown.contractorAmount,
      stripe_processing_fee: feeBreakdown.stripeFee,
      fee_transfer_status: feeTransferResult?.status || 'pending',
      fee_transfer_id: feeTransferResult?.feeTransferId || null,
      metadata: {
        ...(typeof escrow.metadata === 'object' && escrow.metadata
          ? escrow.metadata
          : {}),
        auto_released: true,
        auto_released_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update(updateData)
      .eq('id', escrow.id)
      .eq('status', 'release_pending');

    if (updateError) {
      logger.error('Failed to update escrow after auto-release', {
        service: 'EscrowAutoReleaseService',
        escrowId: escrow.id,
        error: updateError.message,
      });

      // Attempt to reverse the transfer
      await stripe.transfers.createReversal(transfer.id).catch((err) => {
        logger.error('Failed to reverse transfer after DB error', err, {
          service: 'EscrowAutoReleaseService',
          transferId: transfer.id,
        });
      });

      // Release the claim (release_pending -> held) so a later cron run can
      // retry cleanly instead of the row being stranded in release_pending.
      const { error: revertError } = await serverSupabase
        .from('escrow_transactions')
        .update({ status: 'held', updated_at: new Date().toISOString() })
        .eq('id', escrow.id)
        .eq('status', 'release_pending');
      if (revertError) {
        logger.error('Failed to revert escrow claim after transfer reversal', {
          service: 'EscrowAutoReleaseService',
          escrowId: escrow.id,
          error: revertError.message,
        });
      }

      return false;
    }

    logger.info('Escrow auto-released successfully', {
      service: 'EscrowAutoReleaseService',
      escrowId: escrow.id,
      transferId: transfer.id,
      originalAmount: escrow.amount,
      platformFee: feeBreakdown.platformFee,
      contractorAmount: feeBreakdown.contractorAmount,
      feeTransferId: feeTransferResult?.feeTransferId,
    });

    await notifyAutoRelease({
      escrowId: escrow.id,
      jobId: job.id,
      jobTitle: job.title,
      contractorId: escrow.payee_id,
      homeownerId: job.homeowner_id,
      contractorAmount: feeBreakdown.contractorAmount,
      mode: 'direct',
    });
    return true;
  }
}
