import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';

/** How far back to look for new jobs in the digest */
const DIGEST_WINDOW_DAYS = 7;

/** Minimum gap between digest emails for the same contractor */
const DIGEST_COOLDOWN_DAYS = 6; // slightly less than 7 to tolerate cron drift

/** Max contractors to email per cron run */
const BATCH_LIMIT = 200;

/** Max jobs to show per contractor in the digest */
const MAX_JOBS_IN_DIGEST = 5;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

interface OpenJob {
  id: string;
  title: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  urgency: string | null;
  created_at: string;
}

interface ContractorDigest {
  id: string;
  email: string;
  first_name: string;
  matchingJobs: OpenJob[];
}

function formatBudget(min: number | null, max: number | null): string {
  if (min && max) return `£${min.toFixed(0)}–£${max.toFixed(0)}`;
  if (min) return `From £${min.toFixed(0)}`;
  if (max) return `Up to £${max.toFixed(0)}`;
  return 'Budget on request';
}

function urgencyBadge(urgency: string | null): string {
  if (!urgency || urgency === 'low') return '';
  const colours: Record<string, string> = {
    medium: '#f59e0b',
    high: '#ef4444',
    emergency: '#7f1d1d',
  };
  const colour = colours[urgency] || '#6b7280';
  return `<span style="background:${colour};color:white;font-size:10px;padding:2px 6px;border-radius:4px;text-transform:uppercase;vertical-align:middle;margin-left:6px;">${urgency}</span>`;
}

function buildJobRows(jobs: OpenJob[]): string {
  return jobs
    .map(
      (job) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
          <a href="${BASE_URL}/contractor/jobs/${job.id}"
             style="font-weight: 600; color: #0F172A; text-decoration: none; font-size: 14px;">
            ${job.title}${urgencyBadge(job.urgency)}
          </a>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
            ${job.category} &bull; ${formatBudget(job.budget_min, job.budget_max)}
          </div>
        </td>
        <td style="padding: 12px 0 12px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: top; white-space: nowrap;">
          <a href="${BASE_URL}/contractor/jobs/${job.id}"
             style="display:inline-block;padding:6px 14px;background:#0F172A;color:white;text-decoration:none;border-radius:4px;font-size:12px;font-weight:600;">
            Bid Now
          </a>
        </td>
      </tr>`
    )
    .join('');
}

function buildDigestHtml(firstName: string, jobs: OpenJob[], totalOpenJobs: number): string {
  const jobRows = buildJobRows(jobs);
  const moreJobsLine =
    totalOpenJobs > jobs.length
      ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">…and <strong>${totalOpenJobs - jobs.length}</strong> more open jobs on the platform.</p>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:22px;">This Week's Job Opportunities</h1>
      <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Jobs matching your skills, ready for your bid</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Here are the latest jobs posted this week that match your skills. Be among the first to bid for the best chance of winning.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tbody>
          ${jobRows}
        </tbody>
      </table>

      ${moreJobsLine}

      <p style="margin-top:24px;">
        <a href="${BASE_URL}/contractor/jobs" class="button">Browse All Open Jobs</a>
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p>Questions? <a href="mailto:support@mintenance.com" style="color: #6b7280;">support@mintenance.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export class JobDigestService {
  /**
   * Build personalised job digest emails for active contractors.
   *
   * Matching logic:
   *   1. Get all active, onboarded contractors
   *   2. Get their skills from contractor_skills
   *   3. Get jobs posted in the last 7 days (status 'posted' or 'open')
   *   4. Match by skill_name ↔ job.category (case-insensitive)
   *   5. Skip contractors with 0 matches or already emailed this week
   */
  static async sendWeeklyDigests(): Promise<{ sent: number; failed: number; skipped: number }> {
    const windowStart = new Date(
      Date.now() - DIGEST_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const cooldownCutoff = new Date(
      Date.now() - DIGEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Step 1: Active contractors
    const { data: contractors, error: contractorError } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name')
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .eq('onboarding_completed', true)
      .not('email', 'is', null)
      .limit(BATCH_LIMIT);

    if (contractorError || !contractors || contractors.length === 0) {
      logger.error('Failed to fetch contractors for job digest', contractorError, {
        service: 'job-digest',
      });
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const contractorIds = contractors.map((c) => c.id);

    // Step 2: Skills per contractor
    const { data: allSkills, error: skillsError } = await serverSupabase
      .from('contractor_skills')
      .select('contractor_id, skill_name')
      .in('contractor_id', contractorIds);

    if (skillsError) {
      logger.error('Failed to fetch contractor skills for job digest', skillsError, {
        service: 'job-digest',
      });
      return { sent: 0, failed: 0, skipped: 0 };
    }

    // Build skill map: contractorId → Set<lowerCaseSkillName>
    const skillMap = new Map<string, Set<string>>();
    for (const skill of allSkills || []) {
      if (!skillMap.has(skill.contractor_id)) {
        skillMap.set(skill.contractor_id, new Set());
      }
      skillMap.get(skill.contractor_id)!.add(skill.skill_name.toLowerCase());
    }

    // Step 3: Open jobs posted this week — order by recency; urgency sort is applied in JS
    // (text column sort is lexicographic so we can't rely on DB ordering for urgency)
    const { data: openJobs, error: jobsError } = await serverSupabase
      .from('jobs')
      .select('id, title, category, budget_min, budget_max, urgency, created_at')
      .in('status', ['open', 'posted'])
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(500);

    // Sort semantically: emergency → high → medium → low → null
    const URGENCY_RANK: Record<string, number> = { emergency: 0, high: 1, medium: 2, low: 3 };
    openJobs?.sort((a, b) => {
      const ra = URGENCY_RANK[a.urgency ?? ''] ?? 4;
      const rb = URGENCY_RANK[b.urgency ?? ''] ?? 4;
      return ra - rb;
    });

    if (jobsError || !openJobs || openJobs.length === 0) {
      logger.info('No open jobs this week for digest', { service: 'job-digest' });
      return { sent: 0, failed: 0, skipped: contractors.length };
    }

    // Step 4: Dedup — skip contractors already sent a digest this week
    const { data: recentDigests } = await serverSupabase
      .from('notifications')
      .select('user_id')
      .in('user_id', contractorIds)
      .eq('type', 'job_digest')
      .gte('created_at', cooldownCutoff);

    const recentlyDigestedIds = new Set((recentDigests || []).map((n) => n.user_id));

    // Step 5: Build personalised digests
    const digests: ContractorDigest[] = [];

    for (const contractor of contractors) {
      if (recentlyDigestedIds.has(contractor.id)) {
        continue;
      }

      const skills = skillMap.get(contractor.id) || new Set();

      // If contractor has no skills listed, send all jobs (they haven't specialised yet)
      const matchingJobs =
        skills.size === 0
          ? openJobs.slice(0, MAX_JOBS_IN_DIGEST)
          : openJobs.filter((job) => skills.has(job.category?.toLowerCase() ?? ''));

      if (matchingJobs.length === 0) {
        continue; // No relevant jobs this week — skip this contractor
      }

      digests.push({
        id: contractor.id,
        email: contractor.email as string,
        first_name: contractor.first_name || 'there',
        matchingJobs: matchingJobs.slice(0, MAX_JOBS_IN_DIGEST),
      });
    }

    if (digests.length === 0) {
      logger.info('No contractor digests to send this week', { service: 'job-digest' });
      return { sent: 0, failed: 0, skipped: contractors.length };
    }

    // Step 6: Send emails
    let sent = 0;
    let failed = 0;
    const skipped = contractors.length - recentlyDigestedIds.size - digests.length;

    for (const digest of digests) {
      try {
        await EmailService.sendEmail({
          to: digest.email,
          subject: `${digest.matchingJobs.length} new job${digest.matchingJobs.length > 1 ? 's' : ''} matching your skills this week`,
          html: buildDigestHtml(digest.first_name, digest.matchingJobs, openJobs.length),
        });

        // Record a notification row for dedup tracking.
        // We insert directly (not via NotificationService) so this is email-only
        // and does not trigger a push notification to the contractor's device.
        // action_url lives in the data JSONB column, matching how NotificationService stores it.
        await serverSupabase.from('notifications').insert({
          user_id: digest.id,
          title: 'Weekly Job Digest',
          message: `${digest.matchingJobs.length} new job${digest.matchingJobs.length > 1 ? 's' : ''} matching your skills this week`,
          type: 'job_digest',
          read: false,
          data: { action_url: '/contractor/jobs' },
        });

        sent++;
      } catch (error) {
        logger.error('Failed to send job digest email', error, {
          service: 'job-digest',
          contractorId: digest.id,
        });
        failed++;
      }
    }

    return { sent, failed, skipped };
  }
}
