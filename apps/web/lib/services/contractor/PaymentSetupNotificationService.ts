import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export class PaymentSetupNotificationService {
  /**
   * Send notification to contractor when escrow is ready but they haven't set up payments
   */
  static async notifyPaymentSetupRequired(
    contractorId: string,
    escrowId: string,
    jobTitle: string,
    amount: number
  ): Promise<void> {
    try {
      // Check if contractor has payment setup
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('stripe_connect_account_id')
        .eq('id', contractorId)
        .single();

      if (contractor?.stripe_connect_account_id) {
        return; // Already set up, no notification needed
      }

      // Create notification
      await serverSupabase.from('notifications').insert({
        user_id: contractorId,
        title: 'Payment Setup Required',
        message: `You have £${amount.toFixed(2)} waiting in escrow for "${jobTitle}". Complete your payment setup to receive funds.`,
        type: 'payment_setup_required',
        action_url: '/contractor/payouts',
        metadata: {
          escrowId,
          amount,
          jobTitle,
        },
        created_at: new Date().toISOString(),
      });

      logger.info('Payment setup notification sent', {
        service: 'payment-setup-notifications',
        contractorId,
        escrowId,
      });
    } catch (error) {
      logger.error('Failed to send payment setup notification', error, {
        service: 'payment-setup-notifications',
        contractorId,
        escrowId,
      });
    }
  }

  /**
   * Get contractors with pending payments but no payment setup
   */
  static async getContractorsNeedingSetup(): Promise<Array<{
    contractorId: string;
    contractorName: string;
    contractorEmail: string;
    pendingEscrows: number;
    totalPendingAmount: number;
    oldestEscrowDate: string;
  }>> {
    // Get all escrows in pending states
    const { data: escrows, error } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        amount,
        created_at,
        jobs!inner (
          contractor_id,
          title
        )
      `)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending']);

    if (error || !escrows) {
      logger.error('Failed to fetch escrows for payment setup check', error);
      return [];
    }

    // Get unique contractor IDs
    const contractorIds = [...new Set(escrows.map((e) => (e.jobs as any).contractor_id))];

    // Get contractors without payment setup
    const { data: contractors, error: contractorsError } = await serverSupabase
      .from('users')
      .select('id, first_name, last_name, email, stripe_connect_account_id')
      .in('id', contractorIds)
      .eq('role', 'contractor')
      .is('stripe_connect_account_id', null);

    if (contractorsError || !contractors) {
      logger.error('Failed to fetch contractors needing setup', contractorsError);
      return [];
    }

    // Group escrows by contractor
    const contractorMap = new Map<string, {
      contractorId: string;
      contractorName: string;
      contractorEmail: string;
      pendingEscrows: number;
      totalPendingAmount: number;
      oldestEscrowDate: string;
    }>();

    for (const escrow of escrows) {
      const job = escrow.jobs as any;
      const contractorId = job.contractor_id;

      // Only include contractors without setup
      const contractor = contractors.find((c) => c.id === contractorId);
      if (!contractor) {
        continue;
      }

      const existing = contractorMap.get(contractorId);

      if (existing) {
        existing.pendingEscrows++;
        existing.totalPendingAmount += escrow.amount || 0;
        if (new Date(escrow.created_at) < new Date(existing.oldestEscrowDate)) {
          existing.oldestEscrowDate = escrow.created_at;
        }
      } else {
        contractorMap.set(contractorId, {
          contractorId,
          contractorName: `${contractor.first_name} ${contractor.last_name}`,
          contractorEmail: contractor.email,
          pendingEscrows: 1,
          totalPendingAmount: escrow.amount || 0,
          oldestEscrowDate: escrow.created_at,
        });
      }
    }

    return Array.from(contractorMap.values());
  }

  /**
   * Send batch notifications to all contractors needing setup
   */
  static async sendBatchNotifications(): Promise<{
    sent: number;
    failed: number;
  }> {
    const contractors = await this.getContractorsNeedingSetup();
    let sent = 0;
    let failed = 0;

    for (const contractor of contractors) {
      try {
        await serverSupabase.from('notifications').insert({
          user_id: contractor.contractorId,
          title: 'Complete Payment Setup to Receive Funds',
          message: `You have ${contractor.pendingEscrows} payment(s) totaling £${contractor.totalPendingAmount.toFixed(2)} waiting. Set up your payment account now.`,
          type: 'payment_setup_required',
          action_url: '/contractor/payouts',
          metadata: {
            pendingEscrows: contractor.pendingEscrows,
            totalPendingAmount: contractor.totalPendingAmount,
          },
          created_at: new Date().toISOString(),
        });
        sent++;
      } catch (error) {
        logger.error('Failed to send batch notification', error, {
          contractorId: contractor.contractorId,
        });
        failed++;
      }
    }

    return { sent, failed };
  }
}

