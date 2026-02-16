import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface AdminAlert {
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface GenerateAlertsResult {
  created: number;
  skipped: number;
  alerts: AdminAlert[];
}

export class AdminAlertService {
  private static readonly SERVICE_NAME = 'AdminAlertService';

  /**
   * Generate and create admin alerts for conditions needing attention.
   * Each check is independent -- one failure does not block the others.
   */
  static async generateAlerts(): Promise<GenerateAlertsResult> {
    const alerts: AdminAlert[] = [];
    let skipped = 0;

    const checks = [
      () => this.checkOverdueEscrows(alerts),
      () => this.checkUnverifiedContractors(alerts),
      () => this.checkHighValuePayments(alerts),
      () => this.checkStaleJobs(alerts),
      () => this.checkFailedPayments(alerts),
    ];

    for (const check of checks) {
      try {
        const checkSkipped = await check();
        skipped += checkSkipped;
      } catch (error) {
        logger.error('Alert check failed', error, {
          service: this.SERVICE_NAME,
        });
      }
    }

    // Broadcast all non-duplicate alerts to every admin user
    if (alerts.length > 0) {
      try {
        await this.broadcastToAdmins(alerts);
      } catch (error) {
        logger.error('Failed to broadcast alerts to admins', error, {
          service: this.SERVICE_NAME,
        });
      }
    }

    logger.info('Alert generation complete', {
      service: this.SERVICE_NAME,
      created: alerts.length,
      skipped,
    });

    return { created: alerts.length, skipped, alerts };
  }

  // ---------------------------------------------------------------------------
  // Individual alert checks
  // ---------------------------------------------------------------------------

  /**
   * 1. Overdue escrows -- held for more than 14 days without release.
   *    Severity: high
   */
  private static async checkOverdueEscrows(
    alerts: AdminAlert[],
  ): Promise<number> {
    let skipped = 0;
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, created_at')
      .eq('status', 'held')
      .lte('created_at', fourteenDaysAgo.toISOString())
      .limit(50);

    if (error) {
      logger.error('Failed to query overdue escrows', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return skipped;
    }

    for (const escrow of data || []) {
      const alertType = `overdue_escrow_${escrow.id}`;

      const duplicate = await this.isDuplicate(alertType);
      if (duplicate) {
        skipped++;
        continue;
      }

      const daysHeld = Math.floor(
        (Date.now() - new Date(escrow.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      alerts.push({
        type: alertType,
        title: `Overdue Escrow (${daysHeld} days)`,
        message: `Escrow ${escrow.id} for job ${escrow.job_id} has been held for ${daysHeld} days without release. Amount: \u00A3${(escrow.amount / 100).toFixed(2)}.`,
        severity: 'high',
        actionUrl: `/admin/escrow/reviews`,
        metadata: {
          escrowId: escrow.id,
          jobId: escrow.job_id,
          daysHeld,
          amount: escrow.amount,
        },
      });
    }

    return skipped;
  }

  /**
   * 2. Unverified contractors -- registered more than 7 days ago and still
   *    not admin-verified.
   *    Severity: medium
   */
  private static async checkUnverifiedContractors(
    alerts: AdminAlert[],
  ): Promise<number> {
    let skipped = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, company_name, created_at')
      .eq('role', 'contractor')
      .neq('admin_verified', true)
      .is('deleted_at', null)
      .lte('created_at', sevenDaysAgo.toISOString())
      .limit(50);

    if (error) {
      logger.error('Failed to query unverified contractors', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return skipped;
    }

    const contractors = data || [];
    if (contractors.length === 0) {
      return skipped;
    }

    // Deduplicate at the batch level -- one alert for the whole group
    const alertType = 'unverified_contractors_batch';
    const duplicate = await this.isDuplicate(alertType);
    if (duplicate) {
      return skipped + 1;
    }

    const daysSinceOldest = Math.floor(
      (Date.now() - new Date(contractors[0].created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    alerts.push({
      type: alertType,
      title: `${contractors.length} Unverified Contractor${contractors.length > 1 ? 's' : ''}`,
      message: `${contractors.length} contractor${contractors.length > 1 ? 's have' : ' has'} been registered for over 7 days without verification. Oldest: ${daysSinceOldest} days.`,
      severity: 'medium',
      actionUrl: '/admin/users?verified=pending',
      metadata: {
        count: contractors.length,
        contractorIds: contractors.map((c) => c.id),
        daysSinceOldest,
      },
    });

    return skipped;
  }

  /**
   * 3. High-value payments -- any escrow transaction over 5000 (amount in
   *    pence, so 500000) created in the last 24 hours.
   *    Severity: high
   */
  private static async checkHighValuePayments(
    alerts: AdminAlert[],
  ): Promise<number> {
    let skipped = 0;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Amount stored in pence -- 5000 GBP = 500_000 pence
    const HIGH_VALUE_THRESHOLD = 500_000;

    const { data, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, payer_id, payee_id, created_at')
      .gte('amount', HIGH_VALUE_THRESHOLD)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(50);

    if (error) {
      logger.error('Failed to query high-value payments', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return skipped;
    }

    for (const payment of data || []) {
      const alertType = `high_value_payment_${payment.id}`;

      const duplicate = await this.isDuplicate(alertType);
      if (duplicate) {
        skipped++;
        continue;
      }

      alerts.push({
        type: alertType,
        title: `High-Value Payment: \u00A3${(payment.amount / 100).toFixed(2)}`,
        message: `A payment of \u00A3${(payment.amount / 100).toFixed(2)} was made for job ${payment.job_id}. Please review for compliance.`,
        severity: 'high',
        actionUrl: `/admin/escrow/reviews`,
        metadata: {
          escrowId: payment.id,
          jobId: payment.job_id,
          amount: payment.amount,
          payerId: payment.payer_id,
          payeeId: payment.payee_id,
        },
      });
    }

    return skipped;
  }

  /**
   * 4. Stale jobs -- in 'assigned' status for more than 30 days without
   *    any progress.
   *    Severity: low
   */
  private static async checkStaleJobs(
    alerts: AdminAlert[],
  ): Promise<number> {
    let skipped = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await serverSupabase
      .from('jobs')
      .select('id, title, homeowner_id, contractor_id, updated_at')
      .eq('status', 'assigned')
      .lte('updated_at', thirtyDaysAgo.toISOString())
      .limit(50);

    if (error) {
      logger.error('Failed to query stale jobs', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return skipped;
    }

    const staleJobs = data || [];
    if (staleJobs.length === 0) {
      return skipped;
    }

    // Deduplicate at the batch level
    const alertType = 'stale_jobs_batch';
    const duplicate = await this.isDuplicate(alertType);
    if (duplicate) {
      return skipped + 1;
    }

    const daysSinceOldest = Math.floor(
      (Date.now() - new Date(staleJobs[0].updated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    alerts.push({
      type: alertType,
      title: `${staleJobs.length} Stale Job${staleJobs.length > 1 ? 's' : ''}`,
      message: `${staleJobs.length} job${staleJobs.length > 1 ? 's have' : ' has'} been in "assigned" status for over 30 days. Oldest: ${daysSinceOldest} days without progress.`,
      severity: 'low',
      actionUrl: '/admin/jobs?status=assigned&sort=updated_at',
      metadata: {
        count: staleJobs.length,
        jobIds: staleJobs.map((j) => j.id),
        daysSinceOldest,
      },
    });

    return skipped;
  }

  /**
   * 5. Failed payments -- users with more than 3 failed payment attempts in
   *    the last 24 hours.
   *    Severity: critical
   */
  private static async checkFailedPayments(
    alerts: AdminAlert[],
  ): Promise<number> {
    let skipped = 0;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Fetch recent failed payment attempts
    const { data, error } = await serverSupabase
      .from('payment_attempts')
      .select('id, user_id, amount, created_at')
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      logger.error('Failed to query failed payment attempts', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return skipped;
    }

    const attempts = data || [];
    if (attempts.length === 0) {
      return skipped;
    }

    // Group by user_id and find users with > 3 failures
    const failuresByUser = new Map<string, typeof attempts>();
    for (const attempt of attempts) {
      const existing = failuresByUser.get(attempt.user_id) || [];
      existing.push(attempt);
      failuresByUser.set(attempt.user_id, existing);
    }

    for (const [userId, userAttempts] of failuresByUser) {
      if (userAttempts.length <= 3) {
        continue;
      }

      const alertType = `failed_payments_${userId}`;
      const duplicate = await this.isDuplicate(alertType);
      if (duplicate) {
        skipped++;
        continue;
      }

      const totalAmount = userAttempts.reduce((sum, a) => sum + a.amount, 0);

      alerts.push({
        type: alertType,
        title: `Multiple Failed Payments (${userAttempts.length} attempts)`,
        message: `User ${userId} has ${userAttempts.length} failed payment attempts in the last 24 hours totalling \u00A3${(totalAmount / 100).toFixed(2)}. Possible fraud or card issue.`,
        severity: 'critical',
        actionUrl: `/admin/users/${userId}`,
        metadata: {
          userId,
          failedCount: userAttempts.length,
          totalAmount,
          attemptIds: userAttempts.map((a) => a.id),
        },
      });
    }

    return skipped;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all admin user IDs for sending alerts.
   */
  private static async getAdminUserIds(): Promise<string[]> {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to fetch admin user IDs', {
        service: this.SERVICE_NAME,
        error: error.message,
      });
      return [];
    }

    return (data || []).map((u) => u.id);
  }

  /**
   * Check if a similar alert was already created in the last 24 hours
   * (deduplication). Uses the notification `type` field which stores the
   * alert type string.
   */
  private static async isDuplicate(alertType: string): Promise<boolean> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data, error } = await serverSupabase
      .from('notifications')
      .select('id')
      .eq('type', alertType)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1);

    if (error) {
      // If the dedup check fails, treat as non-duplicate to avoid silently
      // swallowing alerts.
      logger.error('Deduplication check failed', {
        service: this.SERVICE_NAME,
        alertType,
        error: error.message,
      });
      return false;
    }

    return (data || []).length > 0;
  }

  /**
   * Insert notification rows for every admin user for each alert.
   */
  private static async broadcastToAdmins(
    alerts: AdminAlert[],
  ): Promise<void> {
    const adminIds = await this.getAdminUserIds();

    if (adminIds.length === 0) {
      logger.warn('No admin users found -- alerts will not be persisted', {
        service: this.SERVICE_NAME,
      });
      return;
    }

    const rows = alerts.flatMap((alert) =>
      adminIds.map((adminId) => ({
        user_id: adminId,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        read: false,
        action_url: alert.actionUrl ?? null,
        metadata: {
          severity: alert.severity,
          ...alert.metadata,
        },
        created_at: new Date().toISOString(),
      })),
    );

    // Insert in batches of 100 to stay within Supabase payload limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await serverSupabase
        .from('notifications')
        .insert(batch);

      if (error) {
        logger.error('Failed to insert admin alert notifications', {
          service: this.SERVICE_NAME,
          batchIndex: i,
          batchSize: batch.length,
          error: error.message,
        });
      }
    }

    logger.info('Admin alerts broadcast complete', {
      service: this.SERVICE_NAME,
      alertCount: alerts.length,
      adminCount: adminIds.length,
      totalNotifications: rows.length,
    });
  }
}
