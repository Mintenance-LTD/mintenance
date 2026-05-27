import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  FeeCalculationService,
  type PaymentType,
} from './FeeCalculationService';
import type { ContractorSubscriptionTier } from '@/lib/feature-access-types';

// 2026-05-27 whole-app review Critical #3: removed the local Stripe init
// (was pinned to '2024-04-10', drifted from the canonical
// '2025-01-27.acacia' in @/lib/stripe). This file doesn't actually call
// Stripe — the local instance was dead code. If a future caller needs
// Stripe in here, import from '@/lib/stripe' so the API version stays
// pinned in one place.

export interface FeeTransferOptions {
  /**
   * Escrow transaction ID
   */
  escrowTransactionId: string;

  /**
   * Job ID
   */
  jobId: string;

  /**
   * Contractor ID
   */
  contractorId: string;

  /**
   * Payment amount (original amount before fees)
   */
  amount: number;

  /**
   * Payment intent ID from Stripe
   */
  paymentIntentId: string;

  /**
   * Charge ID from Stripe
   */
  chargeId?: string;

  /**
   * Payment type
   */
  paymentType?: PaymentType;

  /**
   * Currency code
   * @default 'gbp'
   */
  currency?: string;

  /**
   * Contractor's effective subscription tier — drives the platform fee
   * rate (12 / 12 / 8 / 5 % for free / basic / pro / business per
   * PLATFORM_FEE_RATE_BY_TIER).
   *
   * 2026-05-27 whole-app review Critical #1: previously not accepted,
   * so the underlying calculateFees fell back to the 12% default for
   * EVERY contractor. Pro / Business contractors were over-charged
   * 4-7 pts on every auto-release, and `platform_fee_transfers`
   * recorded the wrong amount even when the caller had correctly
   * tier-resolved the escrow row update.
   *
   * Optional: when omitted, the service resolves it from contractorId
   * via FeeCalculationService.resolveContractorTier so legacy callers
   * still produce correct numbers.
   */
  contractorTier?: ContractorSubscriptionTier;
}

export interface FeeTransferResult {
  /**
   * Platform fee transfer record ID
   */
  feeTransferId: string;

  /**
   * Platform fee amount
   */
  platformFee: number;

  /**
   * Stripe processing fee
   */
  stripeFee: number;

  /**
   * Net platform revenue
   */
  netRevenue: number;

  /**
   * Fee transfer status
   */
  status: 'pending' | 'transferred' | 'held' | 'failed';
}

/**
 * Service for managing platform fee transfers
 *
 * Handles:
 * - Creating fee transfer records
 * - Transferring platform fees to platform account
 * - Admin holds on fee transfers
 * - Batch fee transfers
 * - Fee transfer tracking and reporting
 */
export class FeeTransferService {
  /**
   * Transfer platform fee to platform account
   *
   * Note: In Stripe Connect, platform fees are automatically deducted
   * when transferring to connected accounts. This method creates a
   * record for tracking and accounting purposes.
   *
   * @param options - Fee transfer options
   * @returns Fee transfer result
   */
  static async transferPlatformFee(
    options: FeeTransferOptions
  ): Promise<FeeTransferResult> {
    const {
      escrowTransactionId,
      jobId,
      contractorId,
      amount,
      paymentIntentId,
      chargeId,
      paymentType = 'final',
      currency = 'gbp',
      contractorTier: passedTier,
    } = options;

    // 2026-05-27 whole-app review Critical #1: defense-in-depth — when
    // the caller didn't pass a tier (legacy callers, tests), resolve
    // it ourselves so platform_fee_transfers never records the wrong
    // rate. resolveContractorTier is fail-safe (returns 'basic' on
    // lookup error, so we never accidentally undercharge).
    const contractorTier =
      passedTier ??
      (await FeeCalculationService.resolveContractorTier(contractorId));

    // Calculate fees with the resolved tier
    const feeBreakdown = FeeCalculationService.calculateFees(amount, {
      paymentType,
      currency,
      contractorTier,
    });

    // Create fee transfer record
    const { data: feeTransfer, error: insertError } = await serverSupabase
      .from('platform_fee_transfers')
      .insert({
        escrow_transaction_id: escrowTransactionId,
        job_id: jobId,
        contractor_id: contractorId,
        amount: feeBreakdown.platformFee,
        currency,
        stripe_processing_fee: feeBreakdown.stripeFee,
        net_revenue: feeBreakdown.netPlatformRevenue,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !feeTransfer) {
      logger.error('Failed to create fee transfer record', insertError, {
        service: 'fee-transfer',
        escrowTransactionId,
        jobId,
        contractorId,
      });
      throw new Error('Failed to create fee transfer record');
    }

    // Update escrow transaction with fee details
    await serverSupabase
      .from('escrow_transactions')
      .update({
        platform_fee: feeBreakdown.platformFee,
        contractor_payout: feeBreakdown.contractorAmount,
        stripe_processing_fee: feeBreakdown.stripeFee,
        fee_transfer_status: 'pending',
        payment_type: paymentType,
      })
      .eq('id', escrowTransactionId);

    // In Stripe Connect, platform fees are automatically deducted
    // We mark the transfer as 'transferred' since Stripe handles it
    // For accounting purposes, we still track it in our database
    const { error: updateError } = await serverSupabase
      .from('platform_fee_transfers')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
      })
      .eq('id', feeTransfer.id);

    if (updateError) {
      logger.error('Failed to update fee transfer status', updateError, {
        service: 'fee-transfer',
        feeTransferId: feeTransfer.id,
      });
      // Don't throw - fee transfer record exists, just status update failed
    }

    // Update escrow transaction fee transfer status
    await serverSupabase
      .from('escrow_transactions')
      .update({
        fee_transfer_status: 'transferred',
        fee_transferred_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId);

    logger.info('Platform fee transferred', {
      service: 'fee-transfer',
      feeTransferId: feeTransfer.id,
      escrowTransactionId,
      platformFee: feeBreakdown.platformFee,
      netRevenue: feeBreakdown.netPlatformRevenue,
    });

    return {
      feeTransferId: feeTransfer.id,
      platformFee: feeBreakdown.platformFee,
      stripeFee: feeBreakdown.stripeFee,
      netRevenue: feeBreakdown.netPlatformRevenue,
      status: 'transferred',
    };
  }

  /**
   * Hold fee transfer (admin action)
   *
   * @param feeTransferId - Fee transfer record ID
   * @param adminId - Admin user ID placing the hold
   * @param reason - Reason for hold
   */
  static async holdFeeTransfer(
    feeTransferId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const { error } = await serverSupabase
      .from('platform_fee_transfers')
      .update({
        status: 'held',
        hold_reason: reason,
        held_by: adminId,
        held_at: new Date().toISOString(),
      })
      .eq('id', feeTransferId);

    if (error) {
      logger.error('Failed to hold fee transfer', error, {
        service: 'fee-transfer',
        feeTransferId,
        adminId,
      });
      throw new Error('Failed to hold fee transfer');
    }

    // Update escrow transaction fee transfer status
    const { data: feeTransfer } = await serverSupabase
      .from('platform_fee_transfers')
      .select('escrow_transaction_id')
      .eq('id', feeTransferId)
      .single();

    if (feeTransfer) {
      await serverSupabase
        .from('escrow_transactions')
        .update({
          fee_transfer_status: 'held',
          fee_hold_reason: reason,
        })
        .eq('id', feeTransfer.escrow_transaction_id);
    }

    logger.info('Fee transfer held', {
      service: 'fee-transfer',
      feeTransferId,
      adminId,
      reason,
    });
  }

  /**
   * Release held fee transfer (admin action)
   *
   * @param feeTransferId - Fee transfer record ID
   * @param adminId - Admin user ID releasing the hold
   */
  static async releaseFeeTransfer(
    feeTransferId: string,
    adminId: string
  ): Promise<void> {
    const { error } = await serverSupabase
      .from('platform_fee_transfers')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
        hold_reason: null,
        held_by: null,
      })
      .eq('id', feeTransferId)
      .eq('status', 'held'); // Only release if currently held

    if (error) {
      logger.error('Failed to release fee transfer', error, {
        service: 'fee-transfer',
        feeTransferId,
        adminId,
      });
      throw new Error('Failed to release fee transfer');
    }

    // Update escrow transaction fee transfer status
    const { data: feeTransfer } = await serverSupabase
      .from('platform_fee_transfers')
      .select('escrow_transaction_id')
      .eq('id', feeTransferId)
      .single();

    if (feeTransfer) {
      await serverSupabase
        .from('escrow_transactions')
        .update({
          fee_transfer_status: 'transferred',
          fee_transferred_at: new Date().toISOString(),
          fee_hold_reason: null,
        })
        .eq('id', feeTransfer.escrow_transaction_id);
    }

    logger.info('Fee transfer released', {
      service: 'fee-transfer',
      feeTransferId,
      adminId,
    });
  }

  /**
   * Get pending fee transfers
   *
   * @param limit - Maximum number of records to return
   * @returns Array of pending fee transfers
   */
  static async getPendingFeeTransfers(limit: number = 100) {
    const { data, error } = await serverSupabase
      .from('platform_fee_transfers')
      .select(
        `
        *,
        escrow_transactions!inner(id, amount, status),
        jobs!inner(id, title, contractor_id, homeowner_id),
        profiles!platform_fee_transfers_contractor_id_fkey(id, first_name, last_name, email)
      `
      )
      .in('status', ['pending', 'held'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get pending fee transfers', error, {
        service: 'fee-transfer',
      });
      throw new Error('Failed to get pending fee transfers');
    }

    return data || [];
  }

  /**
   * Batch transfer multiple fees
   *
   * @param feeTransferIds - Array of fee transfer IDs to transfer
   * @param adminId - Admin user ID performing the batch transfer
   */
  static async batchTransferFees(
    feeTransferIds: string[],
    adminId: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const feeTransferId of feeTransferIds) {
      try {
        await this.releaseFeeTransfer(feeTransferId, adminId);
        success++;
      } catch (error) {
        logger.error('Failed to transfer fee in batch', error, {
          service: 'fee-transfer',
          feeTransferId,
        });
        failed++;
      }
    }

    logger.info('Batch fee transfer completed', {
      service: 'fee-transfer',
      adminId,
      success,
      failed,
      total: feeTransferIds.length,
    });

    return { success, failed };
  }
}
