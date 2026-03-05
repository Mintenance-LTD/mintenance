import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobCreationService } from '@/lib/services/job-creation-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

interface RecurringResult {
  checked: number;
  created: number;
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

export class RecurringJobCreatorService {
  /**
   * Process all due recurring schedules that have auto_create_job enabled.
   * Creates jobs and advances next_due_date.
   */
  static async processSchedules(): Promise<RecurringResult> {
    const result: RecurringResult = { checked: 0, created: 0, errors: 0 };
    const now = new Date().toISOString().split('T')[0];

    // Query both tables: recurring_schedules (landlord) and recurring_maintenance_schedules (property)
    const { data: schedules, error } = await serverSupabase
      .from('recurring_schedules')
      .select('id, owner_id, property_id, title, description, category, frequency, next_due_date, auto_create_job')
      .eq('is_active', true)
      .eq('auto_create_job', true)
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
        // Create the job
        const job = await JobCreationService.getInstance().createJob(
          { id: schedule.owner_id, role: 'homeowner' },
          {
            title: schedule.title,
            description: schedule.description || `Recurring maintenance: ${schedule.title}`,
            category: schedule.category || undefined,
            property_id: schedule.property_id,
          },
        );

        // Advance the next_due_date
        const nextDate = advanceDate(schedule.next_due_date, schedule.frequency);
        await serverSupabase
          .from('recurring_schedules')
          .update({ next_due_date: nextDate })
          .eq('id', schedule.id);

        // Notify the owner
        await NotificationService.createNotification({
          userId: schedule.owner_id,
          type: 'recurring_job_created',
          title: `Recurring job created: ${schedule.title}`,
          message: `A new job "${schedule.title}" has been automatically created from your recurring schedule. Next occurrence: ${new Date(nextDate).toLocaleDateString('en-GB')}.`,
          actionUrl: `/jobs/${job.id}`,
          metadata: { schedule_id: schedule.id, job_id: job.id },
        });

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
