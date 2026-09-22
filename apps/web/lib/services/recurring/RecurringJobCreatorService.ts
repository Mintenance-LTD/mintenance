import { advanceRecurringDate } from './advance-recurring-date';
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

export class RecurringJobCreatorService {
  private static async advanceSchedule(
    id: string,
    due: string,
    next: string,
    frequency: string,
    ownerId: string,
    propertyId: string
  ) {
    const { data, error } = await serverSupabase
      .from('recurring_schedules')
      .update({ next_due_date: next })
      .eq('id', id)
      .eq('next_due_date', due)
      .eq('is_active', true)
      .eq('auto_create_job', true)
      .eq('frequency', frequency)
      .eq('owner_id', ownerId)
      .eq('property_id', propertyId)
      .select('id');
    if (error)
      throw new Error(
        'Job exists but schedule advancement failed; retry this cycle.'
      );
    if (!data?.length)
      throw new Error(
        'Schedule changed during processing; refresh before retrying.'
      );
  }

  static async processSchedules(): Promise<RecurringResult> {
    const result: RecurringResult = {
      checked: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    };
    const now = new Date().toISOString().split('T')[0];
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
      // 2026-05-24 audit-34 P1: orphan-after-account-delete safeguard.
      // recurring_schedules.owner_id is now ON DELETE SET NULL (so
      // schedule rows survive account deletion for the audit trail),
      // but JobCreationService needs a real homeowner to attach the
      // created job to. Skip orphaned rows here so the cron doesn't
      // try to create jobs for a deleted user.
      .not('owner_id', 'is', null)
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
      try {
        const nextDate = advanceRecurringDate(
          schedule.next_due_date,
          schedule.frequency
        );
        // Exact-cycle lookup; the database unique index also protects concurrent inserts.
        const { data: existing, error: existingErr } = await serverSupabase
          .from('jobs')
          .select('id')
          .eq('homeowner_id', schedule.owner_id)
          .filter('requirements->>from_schedule_id', 'eq', schedule.id)
          .filter(
            'requirements->>schedule_cycle_due',
            'eq',
            schedule.next_due_date
          )
          .limit(1);

        if (existingErr)
          throw new Error(
            'Unable to check the recurring cycle; no job was created.'
          );

        if (existing && existing.length > 0) {
          // Already covered this cycle — just advance the date.
          await this.advanceSchedule(
            schedule.id,
            schedule.next_due_date,
            nextDate,
            schedule.frequency,
            schedule.owner_id,
            schedule.property_id
          );
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
        await this.advanceSchedule(
          schedule.id,
          schedule.next_due_date,
          nextDate,
          schedule.frequency,
          schedule.owner_id,
          schedule.property_id
        );

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
