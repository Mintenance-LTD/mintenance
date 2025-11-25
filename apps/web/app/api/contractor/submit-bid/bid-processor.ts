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
  status: 'pending';
  competitiveness_score?: number;
  pricing_recommendation_id?: string;
  suggested_price_range?: Record<string, number>;
  was_price_recommended?: boolean;
  updated_at: string;
}

interface ExistingBid {
  id: string;
  quote_id?: string | null;
}

/**
 * Check if contractor already has a bid on this job
 */
export async function checkExistingBid(
  jobId: string,
  contractorId: string
): Promise<ExistingBid | null> {
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('id, quote_id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single();

  return existingBid;
}

/**
 * Create a new bid in the database
 */
export async function createBid(
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  const insertPayload = {
    ...payload,
    created_at: new Date().toISOString(),
  };

  const { data: newBid, error: insertError } = await serverSupabase
    .from('bids')
    .insert(insertPayload)
    .select()
    .single();

  return { bid: newBid, error: insertError };
}

/**
 * Update an existing bid
 */
export async function updateBid(
  bidId: string,
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  const { data: updatedBid, error: updateError } = await serverSupabase
    .from('bids')
    .update(payload)
    .eq('id', bidId)
    .select()
    .single();

  return { bid: updatedBid, error: updateError };
}

/**
 * Handle race condition when bid already exists
 */
export async function handleRaceCondition(
  jobId: string,
  contractorId: string,
  payload: BidPayload
): Promise<{ bid: unknown; error: unknown }> {
  const { data: raceConditionBid } = await serverSupabase
    .from('bids')
    .select('id')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .single();

  if (raceConditionBid) {
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
    // Update existing bid
    const { bid, error: updateError } = await updateBid(existingBid.id, bidPayload);

    if (updateError) {
      logger.error('Failed to update bid', {
        service: 'contractor',
        contractorId,
        jobId: validatedData.jobId,
        bidId: existingBid.id,
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
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
        const errorInfo = {
          service: 'contractor',
          contractorId,
          jobId: validatedData.jobId,
          errorCode: error.code || 'NO_CODE',
          errorMessage: error.message || 'NO_MESSAGE',
        };

        logger.error('Failed to create bid in database', errorInfo);
        throw new Error('Unable to submit bid due to a database error. Please try again or contact support.');
      }
    }

    return { bid, isUpdate: false };
  }
}

/**
 * Get error message for database errors
 */
export function getDatabaseErrorMessage(error: { code?: string; message?: string }): string {
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

