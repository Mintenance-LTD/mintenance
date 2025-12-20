import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const MAX_GUARANTEE_AMOUNT = 2500;
const DEFAULT_GUARANTEE_PERIOD_DAYS = 30;

/**
 * Service for platform-backed guarantee program
 */
export class GuaranteeService {
  /**
   * Create guarantee for a job
   */
  static async createGuarantee(
    jobId: string,
    contractorId: string,
    homeownerId: string,
    jobAmount: number
  ): Promise<string | null> {
    try {
      // Calculate guarantee amount (up to £2,500 or job amount, whichever is less)
      const guaranteeAmount = Math.min(MAX_GUARANTEE_AMOUNT, jobAmount);
      
      const guaranteeStartDate = new Date();
      const guaranteeEndDate = new Date();
      guaranteeEndDate.setDate(guaranteeEndDate.getDate() + DEFAULT_GUARANTEE_PERIOD_DAYS);

      const { data, error } = await serverSupabase
        .from('job_guarantees')
        .insert({
          job_id: jobId,
          contractor_id: contractorId,
          homeowner_id: homeownerId,
          guarantee_amount: guaranteeAmount,
          guarantee_period_days: DEFAULT_GUARANTEE_PERIOD_DAYS,
          guarantee_start_date: guaranteeStartDate.toISOString(),
          guarantee_end_date: guaranteeEndDate.toISOString(),
          status: 'active',
        })
        .select('id')
        .single();

      if (error || !data) {
        logger.error('Failed to create guarantee', {
          service: 'GuaranteeService',
          jobId,
          error: error?.message,
        });
        return null;
      }

      logger.info('Guarantee created', {
        service: 'GuaranteeService',
        guaranteeId: data.id,
        jobId,
        amount: guaranteeAmount,
      });

      return data.id;
    } catch (error) {
      logger.error('Error creating guarantee', error, {
        service: 'GuaranteeService',
        jobId,
      });
      return null;
    }
  }

  /**
   * Submit guarantee claim
   */
  static async submitClaim(
    guaranteeId: string,
    homeownerId: string,
    reason: string,
    evidence: string[]
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('job_guarantees')
        .update({
          status: 'claimed',
          claim_submitted_at: new Date().toISOString(),
          claim_reason: reason,
          claim_evidence: evidence,
        })
        .eq('id', guaranteeId)
        .eq('homeowner_id', homeownerId)
        .eq('status', 'active');

      if (error) {
        logger.error('Failed to submit guarantee claim', {
          service: 'GuaranteeService',
          guaranteeId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error submitting guarantee claim', error, {
        service: 'GuaranteeService',
        guaranteeId,
      });
      return false;
    }
  }

  /**
   * Resolve guarantee claim (admin)
   */
  static async resolveClaim(
    guaranteeId: string,
    adminId: string,
    resolution: string,
    payoutAmount: number
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('job_guarantees')
        .update({
          status: 'resolved',
          claim_resolved_at: new Date().toISOString(),
          claim_resolved_by: adminId,
          claim_resolution: resolution,
          claim_payout_amount: payoutAmount,
        })
        .eq('id', guaranteeId)
        .eq('status', 'claimed');

      if (error) {
        logger.error('Failed to resolve guarantee claim', {
          service: 'GuaranteeService',
          guaranteeId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error resolving guarantee claim', error, {
        service: 'GuaranteeService',
        guaranteeId,
      });
      return false;
    }
  }
}

