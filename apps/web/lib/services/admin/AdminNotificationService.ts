import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';

/**
 * Service for sending admin-related notifications
 */
export class AdminNotificationService {
  /**
   * Send email notification to admin about pending verifications
   */
  static async notifyPendingVerifications(): Promise<void> {
    try {
      // Get count of pending verifications
      const { count, error } = await serverSupabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .eq('admin_verified', false)
        .not('company_name', 'is', null)
        .not('license_number', 'is', null)
        .is('deleted_at', null);

      if (error) {
        logger.error('Failed to count pending verifications', {
          service: 'AdminNotificationService',
          error: error.message,
        });
        return;
      }

      const pendingCount = count || 0;

      if (pendingCount === 0) {
        return; // No pending verifications
      }

      // Get admin email from platform settings
      const { data: setting } = await serverSupabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_email')
        .single();

      const adminEmail = setting?.setting_value || process.env.ADMIN_EMAIL || 'admin@mintenance.com';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .count { font-size: 32px; font-weight: bold; color: #F59E0B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pending Contractor Verifications</h1>
            </div>
            <div class="content">
              <p>Hello Admin,</p>
              <p>You have <span class="count">${pendingCount}</span> contractor verification${pendingCount > 1 ? 's' : ''} pending review.</p>
              <p>Please review and verify these contractors to ensure platform quality and security.</p>
              <a href="${baseUrl}/admin/users?verified=pending" class="button">Review Verifications</a>
              <p style="margin-top: 30px;">This is an automated notification. You can manage notification preferences in the admin settings.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Hello Admin,

You have ${pendingCount} contractor verification${pendingCount > 1 ? 's' : ''} pending review.

Please review and verify these contractors to ensure platform quality and security.

Review verifications: ${baseUrl}/admin/users?verified=pending

This is an automated notification. You can manage notification preferences in the admin settings.

© ${new Date().getFullYear()} Mintenance. All rights reserved.
      `;

      await EmailService.sendEmail({
        to: adminEmail,
        subject: `[Admin] ${pendingCount} Pending Contractor Verification${pendingCount > 1 ? 's' : ''}`,
        html,
        text,
      });

      logger.info('Pending verification notification sent', {
        service: 'AdminNotificationService',
        pendingCount,
        adminEmail,
      });
    } catch (error) {
      logger.error('Failed to send pending verification notification', error, {
        service: 'AdminNotificationService',
      });
    }
  }

  /**
   * Send email to contractor about verification status
   */
  static async notifyContractorVerification(
    contractorId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<boolean> {
    try {
      const { data: contractor, error } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name, company_name')
        .eq('id', contractorId)
        .single();

      if (error || !contractor || !contractor.email) {
        logger.error('Failed to fetch contractor for notification', {
          service: 'AdminNotificationService',
          contractorId,
          error: error?.message,
        });
        return false;
      }

      const contractorName = contractor.first_name && contractor.last_name
        ? `${contractor.first_name} ${contractor.last_name}`
        : contractor.company_name || contractor.email.split('@')[0];

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const isApproved = status === 'approved';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isApproved ? '#10B981' : '#EF4444'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            ${!isApproved && reason ? '.reason-box { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }' : ''}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isApproved ? '✓ Verification Approved' : '✗ Verification Rejected'}</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>Your contractor verification has been <strong>${isApproved ? 'approved' : 'rejected'}</strong>.</p>
              ${!isApproved && reason ? `
                <div class="reason-box">
                  <strong>Reason:</strong><br>
                  ${reason}
                </div>
                <p>Please review the feedback above and resubmit your verification with the necessary corrections.</p>
              ` : ''}
              ${isApproved ? `
                <p>Congratulations! You can now access all verified contractor features on the platform.</p>
                <a href="${baseUrl}/dashboard" class="button">Go to Dashboard</a>
              ` : `
                <a href="${baseUrl}/dashboard/verification" class="button">Update Verification</a>
              `}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Hi ${contractorName},

Your contractor verification has been ${isApproved ? 'approved' : 'rejected'}.

${!isApproved && reason ? `Reason: ${reason}\n\nPlease review the feedback and resubmit your verification.` : ''}

${isApproved ? 'Congratulations! You can now access all verified contractor features.' : 'Please update your verification information.'}

© ${new Date().getFullYear()} Mintenance. All rights reserved.
      `;

      const sent = await EmailService.sendEmail({
        to: contractor.email,
        subject: `Contractor Verification ${isApproved ? 'Approved' : 'Rejected'}`,
        html,
        text,
      });

      if (sent) {
        // Log notification sent
        await serverSupabase
          .from('pending_verification_notifications')
          .insert({
            contractor_id: contractorId,
            notification_type: `verification_${status}`,
            email_sent: true,
          });
      }

      return sent;
    } catch (error) {
      logger.error('Failed to send contractor verification notification', error, {
        service: 'AdminNotificationService',
        contractorId,
        status,
      });
      return false;
    }
  }

  /**
   * Schedule daily pending verification notifications
   */
  static async scheduleDailyNotifications(): Promise<void> {
    try {
      // Check if notifications are enabled
      const { data: setting } = await serverSupabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'pending_verification_email_enabled')
        .single();

      const notificationsEnabled = setting?.setting_value !== false;

      if (!notificationsEnabled) {
        logger.info('Pending verification notifications are disabled', {
          service: 'AdminNotificationService',
        });
        return;
      }

      await this.notifyPendingVerifications();
    } catch (error) {
      logger.error('Failed to schedule daily notifications', error, {
        service: 'AdminNotificationService',
      });
    }
  }
}

