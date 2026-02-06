import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
export class AccountHandler {
  async handleUpdated(event: Stripe.Event): Promise<void> {
    const account = event.data.object as Stripe.Account;
    const supabase = serverSupabase();
    logger.info('Stripe Connect account updated', {
      service: 'stripe-webhook',
      eventId: event.id,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
    try {
      const contractorId = account.metadata?.contractor_id;
      if (!contractorId) {
        logger.warn('Account missing contractor_id in metadata', {
          accountId: account.id,
        });
        return;
      }
      // Update contractor's Stripe Connect status
      const { error } = await supabase
        .from('contractor_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          stripe_account_type: account.type,
          stripe_verification_status: this.getVerificationStatus(account),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractorId);
      if (error) {
        throw new Error(`Failed to update contractor Stripe status: ${error.message}`);
      }
      // Send notifications for important status changes
      if (account.charges_enabled && account.payouts_enabled) {
        // Account fully activated
        await supabase.from('notifications').insert({
          user_id: contractorId,
          type: 'stripe_account_activated',
          title: 'Payment Account Activated',
          message: 'Your payment account is now fully activated. You can receive payments for completed jobs.',
          data: { account_id: account.id },
          created_at: new Date().toISOString(),
        });
      } else if (account.requirements?.currently_due?.length > 0) {
        // Additional information required
        await supabase.from('notifications').insert({
          user_id: contractorId,
          type: 'stripe_verification_required',
          title: 'Account Verification Required',
          message: `Please provide additional information to complete your payment account setup. ${account.requirements?.currently_due?.length ?? 0} item(s) required.`,
          priority: 'high',
          data: {
            account_id: account.id,
            requirements: account.requirements?.currently_due,
          },
          created_at: new Date().toISOString(),
        });
      }
      logger.info('Contractor Stripe account status updated', {
        service: 'stripe-webhook',
        contractorId,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error) {
      logger.error('Failed to process account updated event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId: account.id,
      });
      throw error;
    }
  }
  private getVerificationStatus(account: Stripe.Account): string {
    if (account.charges_enabled && account.payouts_enabled) {
      return 'verified';
    }
    if (account.requirements?.currently_due?.length > 0) {
      return 'pending_verification';
    }
    if (account.requirements?.disabled_reason) {
      return 'rejected';
    }
    return 'unverified';
  }
}