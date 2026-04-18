/**
 * PostJobNudgeService — R5 #7 of docs/RETENTION_ROADMAP_2026.md.
 *
 * 90 days after a job completes, email the homeowner a before/after
 * reminder of the work + 3-5 next-job suggestions tailored to their
 * property category history. Fires via /api/cron/post-job-nudge (daily).
 *
 * Deduplication: we write a row into notifications with
 * type='post_job_nudge' and metadata.job_id, and check that no such
 * row already exists for the (homeowner, job) pair before sending.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface Result {
  evaluated: number;
  sent: number;
  skipped_already_nudged: number;
  email_failed: number;
}

/**
 * Category-aware next-job suggestions. Kept small and opinionated —
 * the email needs to read like a neighbour nudge, not an e-commerce
 * list. Expand over time as completion data tells us what homeowners
 * actually book next.
 */
function nextSuggestions(lastCategory: string | null): string[] {
  const generic = [
    'Book an annual boiler service',
    'Refresh silicone around bath and shower',
    'Deep-clean window and door seals',
  ];
  if (!lastCategory) return generic;

  switch (lastCategory) {
    case 'plumbing':
      return [
        'Book an annual boiler service',
        'Check under-sink seals for water damage',
        'Descale the kettle / shower head',
      ];
    case 'electrical':
      return [
        'Test smoke and CO alarms',
        'Check RCD trip (press the T button on the consumer unit)',
        'Consider an EICR if your last one was 5+ years ago',
      ];
    case 'roofing':
      return [
        'Clear gutters before winter',
        'Check loft insulation thickness',
        'Inspect chimney flashing for movement',
      ];
    case 'painting':
    case 'carpentry':
      return [
        'Touch up external wood with a protective coat',
        'Refresh silicone around doors and windows',
        'Check for rising damp on external walls',
      ];
    case 'heating':
      return [
        'Bleed radiators at the start of heating season',
        'Check boiler pressure is between 1.0-1.5 bar',
        'Book annual boiler service if due',
      ];
    default:
      return generic;
  }
}

async function alreadyNudged(
  homeownerId: string,
  jobId: string
): Promise<boolean> {
  const { data } = await serverSupabase
    .from('notifications')
    .select('id')
    .eq('user_id', homeownerId)
    .eq('type', 'post_job_nudge')
    .contains('metadata', { job_id: jobId })
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function firstAfterPhotoSignedUrl(
  jobId: string,
  which: 'before' | 'after'
): Promise<string | null> {
  const { data } = await serverSupabase
    .from('job_photos_metadata')
    .select('storage_path')
    .eq('job_id', jobId)
    .eq('photo_type', which)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.storage_path) return null;
  const { data: signed } = await serverSupabase.storage
    .from('job-attachments')
    .createSignedUrl(data.storage_path as string, 60 * 60 * 24 * 7);
  return signed?.signedUrl ?? null;
}

export class PostJobNudgeService {
  /**
   * For every job completed ~90 days ago, email + in-app nudge the
   * homeowner. Runs daily — idempotent via alreadyNudged().
   */
  static async sendDailyBatch(): Promise<Result> {
    const result: Result = {
      evaluated: 0,
      sent: 0,
      skipped_already_nudged: 0,
      email_failed: 0,
    };
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 91);
    const windowEnd = new Date(now);
    windowEnd.setUTCDate(windowEnd.getUTCDate() - 89);

    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select('id, title, homeowner_id, contractor_id, category, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', windowStart.toISOString())
      .lt('completed_at', windowEnd.toISOString())
      .limit(500);

    if (error) {
      logger.warn('post-job-nudge: query failed', {
        err: error.message,
      });
      return result;
    }
    if (!jobs || jobs.length === 0) return result;

    result.evaluated = jobs.length;

    // Hydrate profiles in bulk.
    const homeownerIds = Array.from(
      new Set(jobs.map((j) => j.homeowner_id as string))
    );
    const contractorIds = Array.from(
      new Set(
        jobs
          .map((j) => j.contractor_id as string | null)
          .filter((v): v is string => Boolean(v))
      )
    );
    const { data: profiles } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, email, company_name')
      .in('id', [...homeownerIds, ...contractorIds]);
    const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

    for (const job of jobs) {
      const homeownerId = job.homeowner_id as string;
      const jobId = job.id as string;

      if (await alreadyNudged(homeownerId, jobId)) {
        result.skipped_already_nudged += 1;
        continue;
      }

      const owner = byId.get(homeownerId);
      const contractor = job.contractor_id
        ? byId.get(job.contractor_id as string)
        : null;
      if (!owner?.email) {
        continue;
      }

      const [beforeUrl, afterUrl] = await Promise.all([
        firstAfterPhotoSignedUrl(jobId, 'before'),
        firstAfterPhotoSignedUrl(jobId, 'after'),
      ]);

      await NotificationService.createNotification({
        userId: homeownerId,
        type: 'post_job_nudge',
        title: 'Ninety days on',
        message: `Looking back on "${job.title}" — three jobs other homeowners usually tackle next.`,
        actionUrl: '/jobs/create',
        metadata: { job_id: jobId, category: job.category ?? null },
      });

      const contractorName = contractor
        ? (contractor.first_name as string) && (contractor.last_name as string)
          ? `${contractor.first_name} ${contractor.last_name}`
          : (contractor.company_name as string) || 'your contractor'
        : 'your contractor';

      const ok = await EmailService.sendPostJobNudgeEmail(
        owner.email as string,
        {
          homeownerName: (owner.first_name as string) || 'there',
          jobTitle: (job.title as string) || 'your job',
          completedDate: job.completed_at as string,
          contractorName,
          beforePhotoUrl: beforeUrl,
          afterPhotoUrl: afterUrl,
          nextSuggestions: nextSuggestions(job.category as string | null),
          viewUrl: `${baseUrl}/jobs/create`,
        }
      );
      if (ok) result.sent += 1;
      else result.email_failed += 1;
    }

    return result;
  }
}
