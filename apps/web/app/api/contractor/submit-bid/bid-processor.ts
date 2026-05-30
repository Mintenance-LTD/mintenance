/**
 * Bid Processing Logic
 *
 * Handles bid creation, updates, and database operations.
 * Extracted from route.ts to improve maintainability.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { SubmitBidInput } from './validation';

interface BidPayload {
  job_id: string;
  contractor_id: string;
  amount: number;
  description: string;
  message: string; // Canonical column — kept in sync with description
  status: 'pending';
  competitiveness_score?: number;
  pricing_recommendation_id?: string;
  suggested_price_range?: Record<string, number>;
  was_price_recommended?: boolean;
  estimated_duration_days?: number;
  proposed_start_date?: string;
  updated_at: string;
}

interface ExistingBid {
  id: string;
  quote_id?: string | null;
  status?: string | null;
}

/**
 * Check if contractor already has a bid on this job.
 *
 * 2026-05-24 audit-29 P1: now returns the existing bid's `status` too
 * so the caller can refuse to revive terminal bids. The unique
 * constraint on (job_id, contractor_id) means at most one row exists.
 */
async function checkExistingBid(
  jobId: string,
  contractorId: string
): Promise<ExistingBid | null> {
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('id, quote_id, status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single();

  return existingBid;
}

/**
 * Create a new bid in the database
 */
async function createBid(
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  const insertPayload = {
    ...payload,
    created_at: new Date().toISOString(),
  };

  const insertRecord = insertPayload as Record<string, unknown>;
  logger.debug('[BID_CREATE] Inserting bid with payload', {
    service: 'contractor',
    hasEstimatedDuration: 'estimated_duration' in insertPayload,
    hasProposedStartDate: 'proposed_start_date' in insertPayload,
    estimatedDuration: insertRecord.estimated_duration,
    proposedStartDate: insertRecord.proposed_start_date,
  });

  const { data: newBid, error: insertError } = await serverSupabase
    .from('bids')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    logger.error('[BID_CREATE] Database insert error', insertError, {
      service: 'contractor',
      errorCode: insertError.code,
      errorMessage: insertError.message,
    });
  } else {
    const bidRecord = newBid as Record<string, unknown> | null;
    logger.debug('[BID_CREATE] Bid created successfully', {
      service: 'contractor',
      bidId: bidRecord?.id,
      savedEstimatedDuration: bidRecord?.estimated_duration,
      savedProposedStartDate: bidRecord?.proposed_start_date,
    });
  }

  return { bid: newBid, error: insertError };
}

/**
 * Update an existing bid
 */
async function updateBid(
  bidId: string,
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  const payloadRecord = payload as unknown as Record<string, unknown>;
  logger.debug('[BID_UPDATE] Updating bid with payload', {
    service: 'contractor',
    bidId,
    hasEstimatedDuration: 'estimated_duration' in payload,
    hasProposedStartDate: 'proposed_start_date' in payload,
    estimatedDuration: payloadRecord.estimated_duration,
    proposedStartDate: payloadRecord.proposed_start_date,
  });

  const { data: updatedBid, error: updateError } = await serverSupabase
    .from('bids')
    .update(payload)
    .eq('id', bidId)
    .select()
    .single();

  if (updateError) {
    const errRecord = updateError as { code?: string; message?: string };
    logger.error('[BID_UPDATE] Database update error', updateError, {
      service: 'contractor',
      bidId,
      errorCode: errRecord.code,
      errorMessage: errRecord.message,
    });
  } else {
    const bidRecord = updatedBid as Record<string, unknown> | null;
    logger.debug('[BID_UPDATE] Bid updated successfully', {
      service: 'contractor',
      bidId,
      savedEstimatedDuration: bidRecord?.estimated_duration,
      savedProposedStartDate: bidRecord?.proposed_start_date,
    });
  }

  return { bid: updatedBid, error: updateError };
}

/**
 * Handle race condition when bid already exists
 */
async function handleRaceCondition(
  jobId: string,
  contractorId: string,
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  // 2026-05-24 audit-29 P1: mirror the same state-machine gate as
  // processBid's primary path. Reaching here means an INSERT just
  // collided with the unique (job_id, contractor_id) constraint —
  // whichever bid is already there might be terminal, and silently
  // promoting it back to pending would bypass the unreject window.
  const { data: raceConditionBid } = await serverSupabase
    .from('bids')
    .select('id, status')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single();

  if (raceConditionBid) {
    if (raceConditionBid.status && raceConditionBid.status !== 'pending') {
      return {
        bid: null,
        error: new Error(
          `Cannot resubmit a bid that is in "${raceConditionBid.status}" status.`
        ),
      };
    }
    return updateBid(raceConditionBid.id, payload);
  }

  return { bid: null, error: new Error('Bid not found after race condition') };
}

/**
 * Process bid creation or update
 */
export async function processBid(
  validatedData: SubmitBidInput,
  contractorId: string,
  bidPayload: BidPayload
): Promise<{ bid: unknown; isUpdate: boolean }> {
  const existingBid = await checkExistingBid(validatedData.jobId, contractorId);

  if (existingBid) {
    // 2026-05-24 audit-29 P1: lock down accepted + rejected — those
    // are homeowner-driven terminal states and must only be revived
    // via the explicit /unreject 60s window (rejected) or never
    // (accepted; the job has moved past bidding).
    //
    // 2026-05-27 audit-73 P1: withdrawn is a CONTRACTOR-driven state
    // — the contractor chose to pull their bid, and the mobile CTA
    // (JobDetailsCTA.tsx:120) surfaces a "Submit a New Bid" affordance
    // precisely so they can reverse that decision. Previously this
    // branch hard-threw "You previously withdrew this bid. Contact the
    // homeowner if you want to bid again." — a confusing dead-end
    // contradicting the CTA. Treat withdrawn the same as pending here
    // so the update path below re-stamps the row back to pending with
    // the new payload (handled by updateBid → status: 'pending').
    if (
      existingBid.status &&
      existingBid.status !== 'pending' &&
      existingBid.status !== 'withdrawn'
    ) {
      const message =
        existingBid.status === 'accepted'
          ? 'This bid was already accepted. You cannot resubmit it.'
          : existingBid.status === 'rejected'
            ? 'This bid was rejected by the homeowner. Ask them to undo within 60 seconds of the rejection or message them about a new bid.'
            : `Cannot resubmit a bid that is in "${existingBid.status}" status.`;
      throw new Error(message);
    }

    // Update existing bid
    const { bid, error: updateError } = await updateBid(
      existingBid.id,
      bidPayload
    );

    if (updateError) {
      logger.error('Failed to update bid', {
        service: 'contractor',
        contractorId,
        jobId: validatedData.jobId,
        bidId: existingBid.id,
        error:
          updateError instanceof Error ? updateError.message : 'Unknown error',
      });
      throw new Error('Unable to update your bid. Please try again.');
    }

    return { bid, isUpdate: true };
  } else {
    // Create new bid
    const { bid, error: insertError } = await createBid(bidPayload);

    if (insertError) {
      // Handle duplicate bid constraint violation (race condition)
      const error = insertError as { code?: string; message?: string };
      if (
        error.code === '23505' ||
        error.message?.includes('duplicate') ||
        error.message?.includes('unique constraint')
      ) {
        const { bid: raceBid, error: raceError } = await handleRaceCondition(
          validatedData.jobId,
          contractorId,
          bidPayload
        );

        if (raceError) {
          logger.warn('Duplicate bid constraint but bid not found', {
            service: 'contractor',
            contractorId,
            jobId: validatedData.jobId,
          });
          throw new Error('You have already submitted a bid for this job');
        }

        return { bid: raceBid, isUpdate: true };
      } else {
        // Handle other insert errors
        const dbError = error as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        };
        const errorInfo = {
          service: 'contractor',
          contractorId,
          jobId: validatedData.jobId,
          errorCode: dbError.code || 'NO_CODE',
          errorMessage: dbError.message || 'NO_MESSAGE',
          errorDetails: dbError.details,
          errorHint: dbError.hint,
          payloadKeys: Object.keys(bidPayload),
          payloadEstimatedDuration: (
            bidPayload as unknown as Record<string, unknown>
          ).estimated_duration,
          payloadProposedStartDate: (
            bidPayload as unknown as Record<string, unknown>
          ).proposed_start_date,
        };

        logger.error(
          '[BID_CREATE] Failed to create bid in database - full error details',
          {
            ...errorInfo,
            fullError: error,
          }
        );

        // Preserve the original error so it can be properly handled upstream
        const preservedError = Object.assign(
          new Error(
            'Unable to submit bid due to a database error. Please try again or contact support.'
          ),
          { code: dbError.code, details: dbError.details, hint: dbError.hint }
        );
        throw preservedError;
      }
    }

    return { bid, isUpdate: false };
  }
}

/**
 * Get error message for database errors
 */
export function getDatabaseErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  const messageLower = (error.message || '').toLowerCase();

  if (error.code === '23503') {
    return 'Invalid job or contractor reference. Please refresh and try again.';
  }

  if (error.code === '23502') {
    return 'Missing required bid information. Please fill in all fields.';
  }

  if (error.code === '42501') {
    return 'You do not have permission to submit bids. Please check your account status.';
  }

  if (error.code === '23514') {
    return 'Bid failed validation. Please review your inputs and try again.';
  }

  if (
    messageLower.includes('invalid input syntax for type numeric') ||
    messageLower.includes('invalid input syntax')
  ) {
    return 'Bid amount is invalid. Please enter a valid number.';
  }

  return 'Unable to submit bid due to a database error. Please try again or contact support.';
}
