/**
 * Escrow Service - Manages fund holding and release
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

interface Stripe {
  paymentIntents: {
    capture(id: string): Promise<any>;
  };
  transfers: {
    create(params: any): Promise<any>;
  };
}
export interface EscrowServiceConfig {
  stripe: Stripe;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export interface ReleaseEscrowParams {
  jobId: string;
  amount: number;
  reason?: string;
  releasedBy: string;
}
export interface ValidateReleaseParams {
  jobId: string;
  amount: number;
  userId: string;
}
export class EscrowService {
  private stripe: Stripe;
  private supabase: SupabaseClient;
  constructor(config: EscrowServiceConfig) {
    this.stripe = config.stripe;
    this.supabase = config.supabase;
  }
  /**
   * Validate escrow release request
   */
  async validateRelease(params: ValidateReleaseParams): Promise<{ valid: boolean; error?: string }> {
    const { jobId, amount, userId } = params;
    // Get job details
    const { data: job } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (!job) {
      return { valid: false, error: 'Job not found' };
    }
    // Check ownership
    if (job.homeowner_id !== userId) {
      return { valid: false, error: 'Only job owner can release escrow' };
    }
    // Check job status
    if (job.status !== 'completed' && job.status !== 'in_progress') {
      return { valid: false, error: 'Job must be in progress or completed' };
    }
    // Check escrow balance
    const { data: escrow } = await this.supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('job_id', jobId)
      .eq('status', 'held')
      .single();
    if (!escrow) {
      return { valid: false, error: 'No escrow funds found' };
    }
    if (escrow.amount < amount) {
      return { valid: false, error: 'Insufficient escrow balance' };
    }
    // Check for contractor assignment
    if (!job.contractor_id) {
      return { valid: false, error: 'No contractor assigned to job' };
    }
    return { valid: true };
  }
  /**
   * Release escrow funds to contractor
   */
  async releaseEscrow(params: ReleaseEscrowParams): Promise<any> {
    const { jobId, amount, reason, releasedBy } = params;
    // Get job and contractor details
    const { data: job } = await this.supabase
      .from('jobs')
      .select('*, contractor:users!contractor_id(*)')
      .eq('id', jobId)
      .single();
    if (!job || !job.contractor) {
      throw new Error('Invalid job or contractor');
    }
    // Get payment intent for this job
    const { data: paymentIntent } = await this.supabase
      .from('payment_intents')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'requires_capture')
      .single();
    if (!paymentIntent) {
      throw new Error('No payment intent found for escrow release');
    }
    try {
      // Capture the payment
      const captured = await this.stripe.paymentIntents.capture(paymentIntent.id);
      // Create transfer to contractor
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: job.contractor.stripe_account_id,
        transfer_group: `job_${jobId}`,
        description: `Payment for job: ${job.title}`,
        metadata: {
          jobId,
          contractorId: job.contractor_id,
          releasedBy,
          reason: reason || 'Job completed',
        },
      });
      // Update escrow status
      await this.supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          released_by: releasedBy,
          transfer_id: transfer.id,
        })
        .eq('job_id', jobId)
        .eq('status', 'held');
      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          job_id: jobId,
          from_user_id: job.homeowner_id,
          to_user_id: job.contractor_id,
          amount,
          type: 'escrow_release',
          status: 'completed',
          stripe_transfer_id: transfer.id,
          metadata: {
            reason,
            releasedBy,
          },
          created_at: new Date().toISOString(),
        });
      logger.info('Escrow released', {
        jobId,
        amount,
        contractorId: job.contractor_id,
        transferId: transfer.id,
      });
      return {
        transferId: transfer.id,
        amount,
        contractorId: job.contractor_id,
        releasedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Escrow release failed', { error, jobId, amount });
      throw new Error('Failed to release escrow funds');
    }
  }
  /**
   * Get escrow balance for a job
   */
  async getEscrowBalance(jobId: string): Promise<number> {
    const { data } = await this.supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('job_id', jobId)
      .eq('status', 'held');
    const total = (data || []).reduce((sum, tx) => sum + tx.amount, 0);
    return total;
  }
  /**
   * Hold funds in escrow
   */
  async holdFunds(jobId: string, amount: number, paymentIntentId: string): Promise<void> {
    await this.supabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        payment_intent_id: paymentIntentId,
        amount,
        status: 'held',
        created_at: new Date().toISOString(),
      });
    logger.info('Funds held in escrow', { jobId, amount });
  }
}