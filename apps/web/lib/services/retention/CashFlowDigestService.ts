/**
 * CashFlowDigestService — Friday weekly summary for every contractor
 * who settled at least one escrow or has an active held escrow.
 *
 * R2 #16 of docs/RETENTION_ROADMAP_2026.md. Positions Mintenance as
 * "the platform that pays" per the source PDF §4.3 mental-model fix
 * ("I'll never see the money"). Fires Fridays at 09:00 UTC from
 * /api/cron/contractor-cashflow-digest.
 *
 * Channels:
 *   - Email via EmailService.sendCashFlowDigestEmail
 *   - In-app via NotificationService.createNotification(type='cashflow_digest')
 *
 * Both channels are subject to user preferences — a contractor who
 * disables 'cashflow_digest' in settings gets nothing; a contractor who
 * keeps email off but in-app on gets only the inbox card. No push — the
 * content is purely informational and would be noise.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface DigestRow {
  contractor_id: string;
  earned_this_week: number;
  releasing_next_week: number;
  jobs_completed: number;
  active_escrow_count: number;
  active_escrow_total: number;
}

interface DigestResult {
  evaluated: number;
  sent: number;
  skipped_no_activity: number;
  email_failed: number;
}

/**
 * Aggregate the week's escrow activity for every contractor with any
 * signal (settled escrow, held escrow, or completed job in the window).
 * Returns a list of rows ready to fan out to email + in-app.
 */
async function loadDigestRows(
  weekStart: Date,
  weekEnd: Date
): Promise<DigestRow[]> {
  // Two queries, both narrow:
  //  A) escrow_transactions released/completed inside the week, grouped
  //     by payee — gives earned_this_week + jobs_completed.
  //  B) escrow_transactions currently 'held' — gives the protected total.
  const [releasedRes, heldRes] = await Promise.all([
    serverSupabase
      .from('escrow_transactions')
      .select('payee_id, contractor_payout, amount, released_at')
      .in('status', ['released', 'completed'])
      .gte('released_at', weekStart.toISOString())
      .lt('released_at', weekEnd.toISOString()),
    serverSupabase
      .from('escrow_transactions')
      .select('payee_id, amount')
      .eq('status', 'held'),
  ]);

  if (releasedRes.error) {
    logger.warn('cashflow-digest: failed to load released escrows', {
      error: releasedRes.error.message,
    });
  }
  if (heldRes.error) {
    logger.warn('cashflow-digest: failed to load held escrows', {
      error: heldRes.error.message,
    });
  }

  const byContractor = new Map<string, DigestRow>();
  const ensureRow = (id: string): DigestRow => {
    let row = byContractor.get(id);
    if (!row) {
      row = {
        contractor_id: id,
        earned_this_week: 0,
        releasing_next_week: 0,
        jobs_completed: 0,
        active_escrow_count: 0,
        active_escrow_total: 0,
      };
      byContractor.set(id, row);
    }
    return row;
  };

  for (const r of releasedRes.data ?? []) {
    const id = r.payee_id as string | null;
    if (!id) continue;
    const row = ensureRow(id);
    // Prefer contractor_payout (post-fee) when populated; fall back to
    // amount (pre-fee) so the digest is still informative for historical
    // rows that pre-date the fee split.
    const earned = Number(r.contractor_payout ?? r.amount ?? 0);
    row.earned_this_week += earned;
    row.jobs_completed += 1;
  }

  for (const r of heldRes.data ?? []) {
    const id = r.payee_id as string | null;
    if (!id) continue;
    const row = ensureRow(id);
    row.active_escrow_count += 1;
    row.active_escrow_total += Number(r.amount ?? 0);
    // Heuristic: assume held escrows worth >£0 will release in the next
    // 7 days. This is the upper bound; it gives the contractor a reason
    // to keep the app open. Refine when we have auto_release_date.
    row.releasing_next_week += Number(r.amount ?? 0);
  }

  return Array.from(byContractor.values());
}

/**
 * Hydrate rows with contractor name + email. Skip any contractor whose
 * profile is missing or whose role is not 'contractor'.
 */
async function hydrateContractors(
  rows: DigestRow[]
): Promise<Array<DigestRow & { first_name: string; email: string }>> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.contractor_id);
  const { data, error } = await serverSupabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .in('id', ids)
    .eq('role', 'contractor');

  if (error || !data) {
    logger.warn('cashflow-digest: profile hydrate failed', {
      error: error?.message,
    });
    return [];
  }

  const byId = new Map(data.map((p) => [p.id as string, p]));
  return rows.flatMap((r) => {
    const p = byId.get(r.contractor_id);
    if (!p || !p.email) return [];
    return [
      {
        ...r,
        first_name: (p.first_name as string) || 'there',
        email: p.email as string,
      },
    ];
  });
}

export class CashFlowDigestService {
  /**
   * Send the Friday digest to every contractor with activity.
   * Called from /api/cron/contractor-cashflow-digest.
   */
  static async sendWeeklyDigest(): Promise<DigestResult> {
    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);

    const raw = await loadDigestRows(weekStart, weekEnd);
    if (raw.length === 0) {
      return {
        evaluated: 0,
        sent: 0,
        skipped_no_activity: 0,
        email_failed: 0,
      };
    }

    const rows = await hydrateContractors(raw);
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';
    const result: DigestResult = {
      evaluated: rows.length,
      sent: 0,
      skipped_no_activity: 0,
      email_failed: 0,
    };

    for (const row of rows) {
      // Skip contractors with zero signal across the board — nothing
      // meaningful to say.
      if (
        row.earned_this_week === 0 &&
        row.jobs_completed === 0 &&
        row.active_escrow_count === 0
      ) {
        result.skipped_no_activity += 1;
        continue;
      }

      const viewUrl = `${baseUrl}/payments`;

      // In-app: routes through NotificationService which already
      // consults user_notification_preferences (R2).
      await NotificationService.createNotification({
        userId: row.contractor_id,
        type: 'cashflow_digest',
        title: 'Your week on Mintenance',
        message: `£${row.earned_this_week.toFixed(2)} earned this week, ${row.active_escrow_count} job${
          row.active_escrow_count === 1 ? '' : 's'
        } held & protected.`,
        actionUrl: '/payments',
        metadata: {
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
          earned: row.earned_this_week,
          active_count: row.active_escrow_count,
        },
      });

      // Email — fire-and-forget; email failures don't rollback in-app.
      const ok = await EmailService.sendCashFlowDigestEmail(row.email, {
        contractorName: row.first_name,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        earnedThisWeek: row.earned_this_week,
        releasingNextWeek: row.releasing_next_week,
        jobsCompleted: row.jobs_completed,
        activeEscrowCount: row.active_escrow_count,
        activeEscrowTotal: row.active_escrow_total,
        viewUrl,
      });

      if (ok) result.sent += 1;
      else result.email_failed += 1;
    }

    return result;
  }
}
