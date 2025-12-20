import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { asError } from './types';
import type { FeeCalculation } from '@mintenance/types';

export class PayoutService {
  /**
   * Calculate fees
   */
  static calculateFees(amount: number): FeeCalculation {
    let platformFee = Math.max(amount * 0.05, 0.5); // 5% with minimum $0.50
    platformFee = Math.min(platformFee, 50); // Cap at $50

    const stripeFee = Math.round((amount * 0.029 + 0.3) * 100) / 100; // 2.9% + $0.30
    const totalFees = platformFee + stripeFee;
    const contractorAmount = Math.round((amount - totalFees) * 100) / 100;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee,
      contractorAmount,
      totalFees: Math.round(totalFees * 100) / 100,
    };
  }

  /**
   * Setup contractor payout account (Stripe Connect)
   */
  static async setupContractorPayout(
    contractorId: string
  ): Promise<{ accountUrl: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('setup-contractor-payout', {
        body: { contractorId },
      });

      if (error) {
        throw error;
      }

      const payload = (data ?? {}) as Record<string, unknown>;
      const accountUrl = (payload['accountUrl'] ?? payload['url']) as string | undefined;

      if (!accountUrl) {
        throw new Error('Stripe onboarding link was not returned.');
      }

      return { accountUrl };
    } catch (error) {
      logger.error('Setup contractor payout error', error);
      throw asError(error, 'Failed to create Stripe onboarding link.');
    }
  }

  /**
   * Get contractor payout status
   */
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('contractor_payout_accounts')
        .select('*')
        .eq('contractor_id', contractorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { hasAccount: false, accountComplete: false };
        }
        logger.error('Error fetching contractor payout status', error);
        throw new Error('Failed to load contractor payout status.');
      }

      return {
        hasAccount: true,
        accountComplete: data.account_complete,
        accountId: data.stripe_account_id,
      };
    } catch (error) {
      logger.error('Get contractor payout status error', error);
      throw asError(error, 'Failed to load contractor payout status.');
    }
  }
}
