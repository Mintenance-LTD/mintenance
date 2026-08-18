/**
 * Stale Job Service
 *
 * Handles jobs that stall and never progress, on an escalation ladder:
 *   notice (14d) → reminder (30d) → auto-archive (60d).
 *
 * Two stall types:
 *   A) "posted" — homeowner posted a job but never picked a contractor
 *      (clock: jobs.created_at).
 *   B) "unfunded" — a contractor was assigned but the homeowner never funded
 *      escrow / completed payment, so work can't start (clock: jobs.assigned_at).
 *
 * One action per job per run (the HIGHEST applicable stage), so a backlog
 * surfaced on first launch gets a single reminder rather than a burst.
 * Idempotent: notice/reminder are sent once per (job, stage) — guarded by an
 * existing-notification lookup; archive is terminal and self-guards because
 * archived jobs drop out of the candidate query.
 *
 * Driven by the daily cron/stale-job-reminders route.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

const NOTICE_DAYS = 14;
const REMINDER_DAYS = 30;
const ARCHIVE_DAYS = 60;
const BATCH_LIMIT = 100;
const DAY_MS = 1000 * 60 * 60 * 24;

// Escrow statuses that mean money HAS moved into escrow at some point — used
// as a belt-and-suspenders guard so we never archive a job that was actually
// funded but whose jobs.payment_status column lagged behind.
const FUNDED_ESCROW_STATUSES = new Set([
  'held',
  'release_pending',
  'awaiting_homeowner_approval',
  'pending_review',
  'released',
  'completed',
  'refunded',
]);

type Stage = 'notice' | 'reminder' | 'archive';
type StallType = 'posted' | 'unfunded';

const NOTICE_TYPE: Record<Stage, string> = {
  notice: 'stale_job_notice',
  reminder: 'stale_job_reminder',
  archive: 'stale_job_archived',
};

export interface StaleJobResults {
  checkedPosted: number;
  checkedAssigned: number;
  noticesSent: number;
  remindersSent: number;
  archived: number;
  skippedFunded: number;
  errors: number;
}

interface JobRow {
  id: string;
  homeowner_id: string;
  title: string | null;
  created_at: string;
  assigned_at: string | null;
}

function stageForAge(ageDays: number): Stage | null {
  if (ageDays >= ARCHIVE_DAYS) return 'archive';
  if (ageDays >= REMINDER_DAYS) return 'reminder';
  if (ageDays >= NOTICE_DAYS) return 'notice';
  return null;
}

function copyFor(
  stall: StallType,
  stage: Stage,
  title: string
): { title: string; message: string } {
  const name = title || 'your job';
  if (stall === 'posted') {
    if (stage === 'notice') {
      return {
        title: 'Still looking for a contractor?',
        message: `"${name}" has been open for two weeks. Review any bids or refresh it to reach more contractors.`,
      };
    }
    if (stage === 'reminder') {
      return {
        title: 'Your job is still waiting',
        message: `"${name}" has been open a month with no contractor picked. We'll archive it if there's no activity in a few weeks — you can reopen it anytime.`,
      };
    }
    return {
      title: 'We archived your job',
      message: `"${name}" was open for two months with no contractor picked, so we've archived it. Reopen it anytime from your jobs.`,
    };
  }
  // unfunded
  if (stage === 'notice') {
    return {
      title: 'Finish setting up payment',
      message: `"${name}" has a contractor lined up, but payment isn't set up yet. Fund it to get the work started.`,
    };
  }
  if (stage === 'reminder') {
    return {
      title: 'Payment still pending',
      message: `"${name}" has been waiting on payment for a month. Fund it to start, or we'll archive it soon — you can reopen it anytime.`,
    };
  }
  return {
    title: 'We archived your job',
    message: `"${name}" went two months without payment being completed, so we've archived it. Reopen it anytime to pick up where you left off.`,
  };
}

export class StaleJobService {
  /**
   * Walk both stall types and apply the escalation ladder.
   */
  static async processStaleJobs(): Promise<StaleJobResults> {
    const results: StaleJobResults = {
      checkedPosted: 0,
      checkedAssigned: 0,
      noticesSent: 0,
      remindersSent: 0,
      archived: 0,
      skippedFunded: 0,
      errors: 0,
    };

    const now = Date.now();
    const noticeCutoff = new Date(now - NOTICE_DAYS * DAY_MS).toISOString();

    await this.processPostedJobs(results, now, noticeCutoff);
    await this.processUnfundedJobs(results, now, noticeCutoff);

    return results;
  }

  // ── Case A: posted, never picked a contractor ──────────────────────────
  private static async processPostedJobs(
    results: StaleJobResults,
    now: number,
    noticeCutoff: string
  ): Promise<void> {
    const { data, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title, created_at, assigned_at')
      .eq('status', 'posted')
      .is('archived_at', null)
      .is('deleted_at', null)
      .lte('created_at', noticeCutoff)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      logger.error('Failed to fetch posted stale jobs', {
        service: 'StaleJobService',
        error: error.message,
      });
      throw new Error(`Failed to fetch posted stale jobs: ${error.message}`);
    }

    for (const job of (data ?? []) as JobRow[]) {
      results.checkedPosted++;
      const ageDays = Math.floor(
        (now - new Date(job.created_at).getTime()) / DAY_MS
      );
      await this.applyStage(results, job, 'posted', ageDays);
    }
  }

  // ── Case B: assigned, never funded past the payment step ───────────────
  private static async processUnfundedJobs(
    results: StaleJobResults,
    now: number,
    noticeCutoff: string
  ): Promise<void> {
    const { data, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title, created_at, assigned_at')
      .eq('status', 'assigned')
      .is('archived_at', null)
      .is('deleted_at', null)
      .not('assigned_at', 'is', null)
      .lte('assigned_at', noticeCutoff)
      // payment_status='paid' is the funded signal; NULL means never attempted.
      .or('payment_status.is.null,payment_status.neq.paid')
      .order('assigned_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      logger.error('Failed to fetch unfunded stale jobs', {
        service: 'StaleJobService',
        error: error.message,
      });
      throw new Error(`Failed to fetch unfunded stale jobs: ${error.message}`);
    }

    for (const job of (data ?? []) as JobRow[]) {
      results.checkedAssigned++;
      // Belt-and-suspenders: never touch a job that actually has money in
      // escrow, even if payment_status lagged.
      if (await this.hasFundedEscrow(job.id)) {
        results.skippedFunded++;
        continue;
      }
      const anchor = job.assigned_at ?? job.created_at;
      const ageDays = Math.floor((now - new Date(anchor).getTime()) / DAY_MS);
      await this.applyStage(results, job, 'unfunded', ageDays);
    }
  }

  // ── Shared ladder application ──────────────────────────────────────────
  private static async applyStage(
    results: StaleJobResults,
    job: JobRow,
    stall: StallType,
    ageDays: number
  ): Promise<void> {
    const stage = stageForAge(ageDays);
    if (!stage) return;

    try {
      if (stage === 'archive') {
        await this.archiveJob(job, stall, ageDays);
        results.archived++;
        return;
      }

      // notice / reminder — send once per (job, stage).
      if (await this.hasNotification(job.id, NOTICE_TYPE[stage])) return;

      await this.notify(job, stall, stage, ageDays);
      if (stage === 'notice') results.noticesSent++;
      else results.remindersSent++;
    } catch (err) {
      logger.error('Failed to process stale job', err, {
        service: 'StaleJobService',
        jobId: job.id,
        stall,
        stage,
      });
      results.errors++;
    }
  }

  private static async archiveJob(
    job: JobRow,
    stall: StallType,
    ageDays: number
  ): Promise<void> {
    // Guard on archived_at IS NULL so a racing run can't double-archive.
    const { error } = await serverSupabase
      .from('jobs')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', job.id)
      .is('archived_at', null);

    if (error) {
      throw new Error(`Failed to archive job ${job.id}: ${error.message}`);
    }

    await this.notify(job, stall, 'archive', ageDays);
    logger.info('Stale job auto-archived', {
      service: 'StaleJobService',
      jobId: job.id,
      stall,
      ageDays,
    });
  }

  private static async notify(
    job: JobRow,
    stall: StallType,
    stage: Stage,
    ageDays: number
  ): Promise<void> {
    const { title, message } = copyFor(stall, stage, job.title ?? '');
    await NotificationService.createNotification({
      userId: job.homeowner_id,
      type: NOTICE_TYPE[stage],
      title,
      message,
      actionUrl: `/jobs/${job.id}`,
      metadata: { jobId: job.id, stallType: stall, stage, ageDays },
    });
  }

  private static async hasNotification(
    jobId: string,
    type: string
  ): Promise<boolean> {
    const { data, error } = await serverSupabase
      .from('notifications')
      .select('id')
      .eq('type', type)
      .eq('metadata->>jobId', jobId)
      .limit(1);

    if (error) {
      // On lookup failure, err toward NOT re-sending to avoid spamming.
      logger.warn('Stale-job notification lookup failed; skipping this stage', {
        service: 'StaleJobService',
        jobId,
        type,
        error: error.message,
      });
      return true;
    }
    return (data?.length ?? 0) > 0;
  }

  private static async hasFundedEscrow(jobId: string): Promise<boolean> {
    const { data, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id, status')
      .eq('job_id', jobId);

    if (error) {
      // On lookup failure, treat as funded (safe) so we never archive a job
      // we couldn't verify.
      logger.warn('Stale-job escrow lookup failed; treating as funded', {
        service: 'StaleJobService',
        jobId,
        error: error.message,
      });
      return true;
    }
    return (data ?? []).some((row) =>
      FUNDED_ESCROW_STATUSES.has(String(row.status))
    );
  }
}
