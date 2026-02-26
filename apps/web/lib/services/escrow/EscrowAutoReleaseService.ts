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
import { FeeCalculationService, type PaymentType } from '@/lib/services/payment/FeeCalculationService';
import { FeeTransferService } from '@/lib/services/payment/FeeTransferService';
import Stripe from 'stripe';
import { env } from '@/lib/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

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
      .select(`
        id, job_id, payer_id, payee_id, amount, status,
        payment_type, payment_intent_id, metadata,
        auto_release_enabled, auto_release_date,
        admin_hold_status, homeowner_approval, cooling_off_ends_at,
        jobs (id, status, contractor_id, homeowner_id, title)
      `)
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
    const contractorStripeMap = await this.fetchContractorStripeAccounts(
      eligibleEscrows as unknown as EligibleEscrow[]
    );

    // Process each escrow
    for (const rawEscrow of eligibleEscrows) {
      const escrow = rawEscrow as unknown as EligibleEscrow;

      try {
        results.evaluated++;

        const job = escrow.jobs;
        if (!job || job.status !== 'completed') continue;

        // Skip admin-held escrows
        if (escrow.admin_hold_status === 'admin_hold' || escrow.admin_hold_status === 'pending_review') {
          continue;
        }

        // Skip if cooling-off period not passed
        if (escrow.cooling_off_ends_at && new Date(escrow.cooling_off_ends_at) > now) {
          continue;
        }

        // Evaluate auto-release conditions
        const evaluation = await EscrowReleaseAgent.evaluateAutoRelease(escrow.id);
        if (!evaluation || !evaluation.success) {
          if (evaluation?.message?.includes('delayed')) {
            results.delayed++;
          }
          continue;
        }

        // Process the release
        const released = await this.releaseEscrow(escrow, job, contractorStripeMap);
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
   * Pre-fetch Stripe Connect account IDs for all contractors in the batch.
   */
  private static async fetchContractorStripeAccounts(
    escrows: EligibleEscrow[]
  ): Promise<Map<string, string>> {
    const contractorIds = [
      ...new Set(
        escrows
          .map((e) => e.jobs?.contractor_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const map = new Map<string, string>();
    if (contractorIds.length === 0) return map;

    const { data: contractors } = await serverSupabase
      .from('profiles')
      .select('id, stripe_connect_account_id')
      .in('id', contractorIds);

    if (contractors) {
      for (const c of contractors) {
        if (c.stripe_connect_account_id) {
          map.set(c.id, c.stripe_connect_account_id);
        }
      }
    }

    return map;
  }

  /**
   * Execute the Stripe transfer and update escrow records.
   */
  private static async releaseEscrow(
    escrow: EligibleEscrow,
    job: NonNullable<EligibleEscrow['jobs']>,
    contractorStripeMap: Map<string, string>
  ): Promise<boolean> {
    const contractorStripeAccountId = contractorStripeMap.get(job.contractor_id);

    if (!contractorStripeAccountId) {
      await this.notifyMissingStripeAccount(escrow, job);
      return false;
    }

    // Calculate fees
    const paymentType = (escrow.payment_type as PaymentType) || 'final';
    const feeBreakdown = FeeCalculationService.calculateFees(escrow.amount || 0, { paymentType });
    const contractorAmountCents = Math.round(feeBreakdown.contractorAmount * 100);

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: contractorAmountCents,
      currency: 'gbp',
      destination: contractorStripeAccountId,
      description: `Auto-release: ${job.title}`,
      metadata: {
        jobId: job.id,
        escrowId: escrow.id,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        releaseReason: 'auto_release',
        platformFee: feeBreakdown.platformFee.toString(),
        contractorAmount: feeBreakdown.contractorAmount.toString(),
      },
    });

    // Track platform fee
    const chargeId = await this.getChargeId(escrow.payment_intent_id);
    let feeTransferResult;
    try {
      feeTransferResult = await FeeTransferService.transferPlatformFee({
        escrowTransactionId: escrow.id,
        jobId: job.id,
        contractorId: job.contractor_id,
        amount: escrow.amount || 0,
        paymentIntentId: escrow.payment_intent_id || '',
        chargeId,
        paymentType,
      });
    } catch (error) {
      logger.error('Failed to create fee transfer record in auto-release', error, {
        service: 'EscrowAutoReleaseService',
        escrowId: escrow.id,
      });
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
        ...(typeof escrow.metadata === 'object' && escrow.metadata ? escrow.metadata : {}),
        auto_released: true,
        auto_released_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update(updateData)
      .eq('id', escrow.id);

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

    return true;
  }

  /**
   * Retrieve the charge ID from a payment intent for fee tracking.
   */
  private static async getChargeId(paymentIntentId: string | null): Promise<string | undefined> {
    if (!paymentIntentId) return undefined;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;
    } catch {
      logger.warn('Failed to retrieve payment intent for fee tracking', {
        service: 'EscrowAutoReleaseService',
        paymentIntentId,
      });
      return undefined;
    }
  }

  /**
   * Notify contractor about missing Stripe Connect account.
   */
  private static async notifyMissingStripeAccount(
    escrow: EligibleEscrow,
    job: NonNullable<EligibleEscrow['jobs']>
  ): Promise<void> {
    try {
      const { PaymentSetupNotificationService } = await import(
        '@/lib/services/contractor/PaymentSetupNotificationService'
      );
      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        job.contractor_id,
        escrow.id,
        job.title,
        escrow.amount || 0
      );
    } catch (error) {
      logger.error('Failed to send payment setup notification', error);
    }

    logger.error('Contractor missing Stripe Connect account', {
      service: 'EscrowAutoReleaseService',
      contractorId: job.contractor_id,
      escrowId: escrow.id,
    });
  }
}
