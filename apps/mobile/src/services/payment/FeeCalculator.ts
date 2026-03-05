import { supabase } from '../../config/supabase';
import { apiRequest } from './apiHelper';

export class FeeCalculator {
  static calculateFees(amount: number): {
    platformFee: number;
    stripeFee: number;
    contractorAmount: number;
    totalFees: number;
  } {
    const platformRate = 0.05;
    const stripeRate = 0.015; // UK Stripe rate
    const stripeFixed = 0.20; // £0.20 UK fixed fee
    const minPlatformFee = 0.5;
    const maxPlatformFee = 50;

    const rawPlatformFee = amount * platformRate;
    const platformFee = Math.min(
      maxPlatformFee,
      Math.max(minPlatformFee, Number(rawPlatformFee.toFixed(2)))
    );

    const stripeFee = Number((amount * stripeRate + stripeFixed).toFixed(2));
    const totalFees = Number((platformFee + stripeFee).toFixed(2));
    const contractorAmount = Number((amount - totalFees).toFixed(2));

    return { platformFee, stripeFee, contractorAmount, totalFees };
  }

  static async setupContractorPayout(
    contractorId: string
  ): Promise<{ accountUrl: string }> {
    return apiRequest<{ accountUrl: string }>(
      '/api/contractor/payout/setup',
      { method: 'POST', body: { contractorId } }
    );
  }

  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    const { data, error } = await supabase
      .from('contractor_payout_accounts')
      .select('contractor_id, stripe_account_id, account_complete')
      .eq('contractor_id', contractorId)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return { hasAccount: false, accountComplete: false };
      }
      throw new Error(error.message || 'Failed to fetch payout status');
    }

    return {
      hasAccount: true,
      accountComplete: Boolean((data as Record<string, unknown>).account_complete),
      accountId: (data as Record<string, unknown>).stripe_account_id as string | undefined,
    };
  }
}
