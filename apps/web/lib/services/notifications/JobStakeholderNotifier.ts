/**
 * JobStakeholderNotifier — deferred follow-up #5 from R6.
 *
 * Given a job id, resolves every party that should be notified about
 * lifecycle events and fans out through the canonical NotificationService
 * (which respects per-user channel + quiet-hours preferences).
 *
 * The set of parties depends on the job shape:
 *   - homeowner_id   — always (the poster)
 *   - payer_user_id  — when distinct from homeowner (landlord / agency)
 *   - contractor_id  — always (once assigned)
 *   - tenants        — active property_tenants with a linked user_id,
 *                      only when jobs.is_rental_property = true
 *
 * We de-dupe by user_id so the payer posting the job for themselves
 * doesn't get double-notified.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from './NotificationService';
import { EmailService } from '@/lib/email-service';

export type StakeholderRole = 'homeowner' | 'payer' | 'contractor' | 'tenant';

export interface JobStakeholder {
  userId: string;
  role: StakeholderRole;
}

export interface TenantContact {
  name: string;
  email: string;
  propertyId: string;
  // Either user_id (signed up) or email-only (invite pending)
  userId: string | null;
}

export interface StakeholderSet {
  jobId: string;
  title: string;
  propertyAddress: string | null;
  isRental: boolean;
  stakeholders: JobStakeholder[];
  /**
   * Tenants with no linked profile get email-only notifications via
   * the existing tenant email templates — they can't receive in-app or
   * push because there's no auth.uid().
   */
  emailOnlyTenants: TenantContact[];
}

/**
 * Loads every stakeholder for a given job. Safe to call repeatedly —
 * a single round-trip to `jobs` + (when rental) one to `property_tenants`.
 */
export async function resolveStakeholders(
  jobId: string
): Promise<StakeholderSet | null> {
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(
      'id, title, homeowner_id, contractor_id, payer_user_id, property_id, is_rental_property, location'
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    logger.warn('resolveStakeholders: jobs query failed', {
      service: 'JobStakeholderNotifier',
      jobId,
      err: error.message,
    });
    return null;
  }
  if (!job) return null;

  const stakeholders: JobStakeholder[] = [];
  const seen = new Set<string>();
  const push = (userId: string | null | undefined, role: StakeholderRole) => {
    if (!userId || seen.has(userId)) return;
    seen.add(userId);
    stakeholders.push({ userId, role });
  };

  push(job.homeowner_id as string, 'homeowner');
  if (job.payer_user_id) push(job.payer_user_id as string, 'payer');
  if (job.contractor_id) push(job.contractor_id as string, 'contractor');

  const emailOnlyTenants: TenantContact[] = [];
  if (job.is_rental_property && job.property_id) {
    const { data: tenants } = await serverSupabase
      .from('property_tenants')
      .select('name, email, user_id, property_id')
      .eq('property_id', job.property_id as string)
      .eq('is_active', true);

    for (const t of tenants || []) {
      if (t.user_id) {
        push(t.user_id as string, 'tenant');
      } else if (t.email) {
        emailOnlyTenants.push({
          name: (t.name as string) || 'there',
          email: t.email as string,
          propertyId: t.property_id as string,
          userId: null,
        });
      }
    }
  }

  return {
    jobId: job.id as string,
    title: (job.title as string) || 'your job',
    propertyAddress: (job.location as string | null) ?? null,
    isRental: Boolean(job.is_rental_property),
    stakeholders,
    emailOnlyTenants,
  };
}

interface NotifyStakeholdersInput {
  jobId: string;
  /** Notification type — consumed by per-type preference gating. */
  type: string;
  /** Optional per-role title/message override for richer copy. */
  titleFor: (role: StakeholderRole) => string;
  messageFor: (role: StakeholderRole) => string;
  actionUrlFor?: (role: StakeholderRole) => string | undefined;
  /** When true AND the job is a rental, ALSO email the email-only tenants. */
  emailTenants?: boolean;
  /** Status label for the tenant email template (e.g. 'in_progress'). */
  tenantJobStatus?: string;
  /**
   * When set, skip notifying this user id — used by the caller to avoid
   * pinging the actor who triggered the event (e.g. contractor starting
   * their own job should not get a "your job started" ping).
   */
  skipUserId?: string;
  /**
   * When provided, only notify stakeholders whose role is in this list.
   * Use when an existing helper already handles homeowner + contractor
   * (see notifyJobStatusChange) and we only want the NEW R6 roles
   * (payer, tenant) to be notified in addition.
   */
  onlyRoles?: StakeholderRole[];
}

/**
 * Fan out a single lifecycle event to every stakeholder on a job.
 * Non-fatal: errors on individual recipients are logged but don't stop
 * the others.
 */
export async function notifyStakeholders(
  input: NotifyStakeholdersInput
): Promise<{ delivered: number; skipped: number; failed: number }> {
  const result = { delivered: 0, skipped: 0, failed: 0 };
  const set = await resolveStakeholders(input.jobId);
  if (!set) return result;

  for (const s of set.stakeholders) {
    if (input.skipUserId && s.userId === input.skipUserId) {
      result.skipped += 1;
      continue;
    }
    if (input.onlyRoles && !input.onlyRoles.includes(s.role)) {
      result.skipped += 1;
      continue;
    }
    try {
      await NotificationService.createNotification({
        userId: s.userId,
        type: input.type,
        title: input.titleFor(s.role),
        message: input.messageFor(s.role),
        actionUrl: input.actionUrlFor?.(s.role),
        metadata: { job_id: input.jobId, role: s.role },
      });
      result.delivered += 1;
    } catch (err) {
      result.failed += 1;
      logger.warn('notifyStakeholders: per-recipient failure', {
        service: 'JobStakeholderNotifier',
        jobId: input.jobId,
        userId: s.userId,
        role: s.role,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Email-only tenants (no account yet) — best-effort email delivery.
  if (
    input.emailTenants &&
    set.isRental &&
    set.emailOnlyTenants.length > 0 &&
    input.tenantJobStatus
  ) {
    for (const t of set.emailOnlyTenants) {
      try {
        await EmailService.sendTenantJobNotification(t.email, {
          tenantName: t.name,
          propertyAddress: set.propertyAddress ?? 'your property',
          jobTitle: set.title,
          status: input.tenantJobStatus,
          viewUrl: input.actionUrlFor?.('tenant') ?? '',
        });
      } catch (err) {
        logger.warn('notifyStakeholders: tenant email failed', {
          service: 'JobStakeholderNotifier',
          jobId: input.jobId,
          tenantEmail: t.email,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}
