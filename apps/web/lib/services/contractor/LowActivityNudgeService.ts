import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/** How long a contractor must be bid-inactive before receiving a nudge */
const INACTIVITY_THRESHOLD_DAYS = 14;

/** Minimum gap between nudges for the same contractor */
const NUDGE_COOLDOWN_DAYS = 7;

/** Maximum contractors to nudge per cron run */
const BATCH_LIMIT = 100;

export class LowActivityNudgeService {
  /**
   * Find contractors who have not placed a bid in the last 14 days
   * and have not already been nudged in the last 7 days.
   */
  static async getInactiveContractors(): Promise<
    Array<{ id: string; first_name: string; email: string }>
  > {
    const inactivityCutoff = new Date(
      Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Step 1: Get all active, onboarded contractors
    const { data: contractors, error: profileError } = await serverSupabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .eq('onboarding_completed', true)
      .limit(BATCH_LIMIT * 5); // Fetch more than needed; we'll filter below

    if (profileError || !contractors || contractors.length === 0) {
      logger.error('Failed to fetch contractor profiles', profileError, {
        service: 'low-activity-nudge',
      });
      return [];
    }

    const contractorIds = contractors.map((c) => c.id);

    // Step 2: Find contractors who have bid within the active window
    const { data: recentBids, error: bidError } = await serverSupabase
      .from('bids')
      .select('contractor_id, created_at')
      .in('contractor_id', contractorIds)
      .gte('created_at', inactivityCutoff); // Only bids WITHIN the active window

    if (bidError) {
      logger.error('Failed to fetch recent bids', bidError, {
        service: 'low-activity-nudge',
      });
      return [];
    }

    // Contractors with a recent bid are NOT inactive
    const activeContractorIds = new Set(
      (recentBids || []).map((b) => b.contractor_id)
    );

    const inactiveContractors = contractors.filter(
      (c) => !activeContractorIds.has(c.id)
    );

    if (inactiveContractors.length === 0) {
      return [];
    }

    const inactiveIds = inactiveContractors.map((c) => c.id);

    // Step 3: Dedup — exclude contractors already nudged within the cooldown window
    const cooldownCutoff = new Date(
      Date.now() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: recentNudges, error: nudgeError } = await serverSupabase
      .from('notifications')
      .select('user_id')
      .in('user_id', inactiveIds)
      .eq('type', 'low_activity_nudge')
      .gte('created_at', cooldownCutoff);

    if (nudgeError) {
      logger.error('Failed to fetch recent nudge history', nudgeError, {
        service: 'low-activity-nudge',
      });
      return [];
    }

    const recentlyNudgedIds = new Set((recentNudges || []).map((n) => n.user_id));

    return inactiveContractors
      .filter((c) => !recentlyNudgedIds.has(c.id))
      .slice(0, BATCH_LIMIT);
  }

  /**
   * Send low-activity nudges to all qualifying contractors.
   */
  static async sendBatchNudges(): Promise<{ sent: number; failed: number }> {
    const contractors = await this.getInactiveContractors();

    if (contractors.length === 0) {
      logger.info('No inactive contractors to nudge', {
        service: 'low-activity-nudge',
      });
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const contractor of contractors) {
      try {
        await NotificationService.createNotification({
          userId: contractor.id,
          title: 'New jobs are waiting for your bid',
          message: `Hi ${contractor.first_name}, there are open jobs in your area that match your skills. Browse and bid before they're taken.`,
          type: 'low_activity_nudge',
          actionUrl: '/contractor/jobs',
          metadata: {
            inactivityDays: INACTIVITY_THRESHOLD_DAYS,
          },
        });
        sent++;
      } catch (error) {
        logger.error('Failed to send nudge to contractor', error, {
          service: 'low-activity-nudge',
          contractorId: contractor.id,
        });
        failed++;
      }
    }

    return { sent, failed };
  }
}
