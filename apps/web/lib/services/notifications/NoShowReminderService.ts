import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Service for automated no-show detection and reminders
 */
export class NoShowReminderService {
  /**
   * Check for no-shows and send reminders
   */
  static async checkAndSendReminders(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Find jobs scheduled to start within the last hour that haven't been started
      const { data: jobs, error } = await serverSupabase
        .from('jobs')
        .select('id, title, scheduled_start_date, contractor_id, homeowner_id, status')
        .eq('status', 'assigned')
        .not('scheduled_start_date', 'is', null)
        .lte('scheduled_start_date', now.toISOString())
        .gte('scheduled_start_date', oneHourAgo.toISOString());

      if (error) {
        logger.error('Error fetching jobs for no-show check', {
          service: 'NoShowReminderService',
          error: error.message,
        });
        return;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      for (const job of jobs) {
        // Check if job has been started (status changed to in_progress)
        if (job.status === 'assigned') {
          // Send no-show notification
          await this.sendNoShowNotification(job);
        }
      }
    } catch (error) {
      logger.error('Error checking no-shows', error, {
        service: 'NoShowReminderService',
      });
    }
  }

  /**
   * Send no-show notification
   */
  private static async sendNoShowNotification(job: {
    id: string;
    title: string;
    contractor_id: string;
    homeowner_id: string;
  }): Promise<void> {
    try {
      const notifications = [
        {
          user_id: job.contractor_id,
          title: 'Job Start Reminder',
          message: `You have a scheduled job "${job.title}" that was supposed to start. Please mark it as started or contact the homeowner.`,
          type: 'no_show_reminder',
          read: false,
          action_url: `/contractor/jobs/${job.id}`,
          created_at: new Date().toISOString(),
        },
        {
          user_id: job.homeowner_id,
          title: 'Contractor No-Show',
          message: `The contractor hasn't started the scheduled job "${job.title}". You may want to contact them.`,
          type: 'no_show_alert',
          read: false,
          action_url: `/jobs/${job.id}`,
          created_at: new Date().toISOString(),
        },
      ];

      await serverSupabase.from('notifications').insert(notifications);

      logger.info('No-show notifications sent', {
        service: 'NoShowReminderService',
        jobId: job.id,
      });
    } catch (error) {
      logger.error('Error sending no-show notification', error, {
        service: 'NoShowReminderService',
        jobId: job.id,
      });
    }
  }

  /**
   * Send reminder before scheduled start time
   */
  static async sendPreStartReminders(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Find jobs starting in 30 minutes
      const { data: jobs30min, error: error30 } = await serverSupabase
        .from('jobs')
        .select('id, title, scheduled_start_date, contractor_id, homeowner_id')
        .eq('status', 'assigned')
        .not('scheduled_start_date', 'is', null)
        .gte('scheduled_start_date', now.toISOString())
        .lte('scheduled_start_date', thirtyMinutesFromNow.toISOString());

      if (!error30 && jobs30min) {
        for (const job of jobs30min) {
          await this.sendReminder(job, '30 minutes');
        }
      }

      // Find jobs starting in 1 hour
      const { data: jobs1hr, error: error1hr } = await serverSupabase
        .from('jobs')
        .select('id, title, scheduled_start_date, contractor_id, homeowner_id')
        .eq('status', 'assigned')
        .not('scheduled_start_date', 'is', null)
        .gte('scheduled_start_date', thirtyMinutesFromNow.toISOString())
        .lte('scheduled_start_date', oneHourFromNow.toISOString());

      if (!error1hr && jobs1hr) {
        for (const job of jobs1hr) {
          await this.sendReminder(job, '1 hour');
        }
      }
    } catch (error) {
      logger.error('Error sending pre-start reminders', error, {
        service: 'NoShowReminderService',
      });
    }
  }

  /**
   * Send reminder notification
   */
  private static async sendReminder(job: {
    id: string;
    title: string;
    contractor_id: string;
    homeowner_id: string;
    scheduled_start_date: string | null;
  }, timeUntil: string): Promise<void> {
    try {
      const notifications = [
        {
          user_id: job.contractor_id,
          title: 'Upcoming Job',
          message: `Your job "${job.title}" is scheduled to start in ${timeUntil}.`,
          type: 'job_reminder',
          read: false,
          action_url: `/contractor/jobs/${job.id}`,
          created_at: new Date().toISOString(),
        },
      ];

      await serverSupabase.from('notifications').insert(notifications);
    } catch (error) {
      logger.error('Error sending reminder', error, {
        service: 'NoShowReminderService',
        jobId: job.id,
      });
    }
  }
}

