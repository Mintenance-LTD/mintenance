import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobCreationService } from '@/lib/services/job-creation-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

interface RecurringResult {
  checked: number;
  created: number;
  skipped: number;
  errors: number;
}

function advanceDate(date: string, frequency: string): string {
  const d = new Date(date);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'biannual':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'annual':
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Idempotency window — how far back to look for a job already created
 * from this same schedule. 14 days covers cron retries within a billing
 * cycle without bleeding into the next cycle for weekly schedules.
 */
const IDEMPOTENCY_WINDOW_DAYS = 14;

export class RecurringJobCreatorService {
  /**
   * Process all due recurring schedules that have auto_create_job enabled.
   * Creates jobs and advances next_due_date.
   *
   * Idempotency: each created job carries `requirements.from_schedule_id`
   * pointing back at the recurring_schedules row. Before creating a new
   * job we look back IDEMPOTENCY_WINDOW_DAYS for any job already linked
   * to this schedule; if one exists we skip the create but still advance
   * next_due_date. This protects against the race where createJob
   * succeeds but the next_due_date update fails (or the cron is
   * triggered twice in a window) — without it, every retry would
   * silently double-up the homeowner's job list.
   */
  static async processSchedules(): Promise<RecurringResult> {
    const result: RecurringResult = {
      checked: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    };
    const now = new Date().toISOString().split('T')[0];
    const idempotencyCutoff = new Date(
      Date.now() - IDEMPOTENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // `property_id` may be NULL on schedules whose property has been
    // hard-deleted (FK is `ON DELETE SET NULL` after migration
    // 20260520000002 to preserve compliance retention rows). Those
    // orphaned schedules have nowhere to scope a new job, so we
    // skip them at the query level.
    const { data: schedules, error } = await serverSupabase
      .from('recurring_schedules')
      .select(
        'id, owner_id, property_id, title, description, category, frequency, next_due_date, auto_create_job'
      )
      .eq('is_active', true)
      .eq('auto_create_job', true)
      .not('property_id', 'is', null)
      .lte('next_due_date', now);

    if (error) {
      logger.error('Failed to query recurring schedules', {
        service: 'recurring-job-creator',
        error: error.message,
      });
      return { ...result, errors: 1 };
    }

    if (!schedules || schedules.length === 0) {
      return result;
    }

    result.checked = schedules.length;

    for (const schedule of schedules) {
      const nextDate = advanceDate(schedule.next_due_date, schedule.frequency);
      try {
        // Idempotency check — has a job already been created from this
        // schedule in the last 14 days? If so we skip the create but
        // still advance next_due_date so we don't loop forever on the
        // same row.
        const { data: existing, error: existingErr } = await serverSupabase
          .from('jobs')
          .select('id')
          .eq('homeowner_id', schedule.owner_id)
          .gte('created_at', idempotencyCutoff)
          .filter('requirements->>from_schedule_id', 'eq', schedule.id)
          .limit(1);

        if (existingErr) {
          // Don't block on a query failure — log + proceed with create
          logger.warn('Idempotency lookup failed, proceeding with create', {
            service: 'recurring-job-creator',
            scheduleId: schedule.id,
            error: existingErr.message,
          });
        }

        if (existing && existing.length > 0) {
          // Already covered this cycle — just advance the date.
          await serverSupabase
            .from('recurring_schedules')
            .update({ next_due_date: nextDate })
            .eq('id', schedule.id);
          result.skipped++;
          continue;
        }

        // Create the job, tagging it with the schedule_id for next-run
        // idempotency lookups.
        //
        // 2026-05-24 audit-31 P1: JobCreationService.enforcePhotoRequirement
        // rejects any job without photoUrls unless requirements.
        // contractor_before_photos === true. Cron-created recurring jobs
        // have no homeowner-supplied photos by design — the schedule was
        // configured on the property page with no upload step — so set
        // the contractor-before-photos flag so the photo gate is
        // satisfied by the on-arrival capture instead. Without this,
        // every due schedule's job creation throws BadRequestError and
        // the cron never posts the job.
        const job = await JobCreationService.getInstance().createJob(
          { id: schedule.owner_id, role: 'homeowner' },
          {
            title: schedule.title,
            description:
              schedule.description ||
              `Recurring maintenance: ${schedule.title}`,
            category: schedule.category || undefined,
            property_id: schedule.property_id,
            requirements: {
              from_schedule_id: schedule.id,
              schedule_cycle_due: schedule.next_due_date,
              contractor_before_photos: true,
            },
          }
        );

        // Advance the next_due_date.
        await serverSupabase
          .from('recurring_schedules')
          .update({ next_due_date: nextDate })
          .eq('id', schedule.id);

        // Notify the owner. Non-fatal if it fails — the job + date
        // advance are already persisted.
        try {
          await NotificationService.createNotification({
            userId: schedule.owner_id,
            type: 'recurring_job_created',
            title: `Recurring job created: ${schedule.title}`,
            message: `A new job "${schedule.title}" has been automatically created from your recurring schedule. Next occurrence: ${new Date(nextDate).toLocaleDateString('en-GB')}.`,
            actionUrl: `/jobs/${job.id}`,
            metadata: { schedule_id: schedule.id, job_id: job.id },
          });
        } catch (notifyErr) {
          logger.warn('Failed to notify owner about recurring job', {
            service: 'recurring-job-creator',
            scheduleId: schedule.id,
            jobId: job.id,
            error:
              notifyErr instanceof Error
                ? notifyErr.message
                : String(notifyErr),
          });
        }

        result.created++;
      } catch (err) {
        logger.error('Failed to create recurring job', {
          service: 'recurring-job-creator',
          scheduleId: schedule.id,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    return result;
  }
}
