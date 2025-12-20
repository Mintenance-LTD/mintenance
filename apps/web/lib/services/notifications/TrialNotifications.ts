import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { TrialService } from '@/lib/services/subscription/TrialService';

/**
 * Service for sending trial and subscription-related notifications
 */
export class TrialNotifications {
  /**
   * Send welcome email when trial starts
   */
  static async sendTrialWelcomeEmail(contractorId: string): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name, trial_ends_at')
        .eq('id', contractorId)
        .single();

      if (!user || !user.email) {
        logger.warn('Cannot send trial welcome email - user not found', {
          service: 'TrialNotifications',
          contractorId,
        });
        return false;
      }

      const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
      const trialEndDate = trialEndsAt ? trialEndsAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) : 'soon';

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const contractorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Contractor';

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
            .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Mintenance!</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>Your free trial has started! You now have full access to the Mintenance platform for 30 days.</p>
              <p><strong>Trial ends:</strong> ${trialEndDate}</p>
              <p>During your trial, you can:</p>
              <ul>
                <li>Browse and bid on jobs</li>
                <li>Connect with homeowners</li>
                <li>Complete projects and receive payments</li>
                <li>Pay only 5% transaction fees (no subscription required during trial)</li>
              </ul>
              <p>After your trial ends, you'll need to subscribe to continue using the platform.</p>
              <a href="${baseUrl}/contractor/subscription" class="button">View Subscription Plans</a>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Mintenance - Your Free Trial Has Started!',
        html,
      });
    } catch (err) {
      logger.error('Error sending trial welcome email', {
        service: 'TrialNotifications',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Send trial expiration warning
   */
  static async sendTrialExpirationWarning(
    contractorId: string,
    daysRemaining: number
  ): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name, trial_ends_at')
        .eq('id', contractorId)
        .single();

      if (!user || !user.email) {
        return false;
      }

      const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
      const trialEndDate = trialEndsAt ? trialEndsAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) : 'soon';

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const contractorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Contractor';

      const warning = TrialService.getTrialWarnings(daysRemaining);
      const urgency = warning?.level === 'urgent' ? 'urgent' : daysRemaining <= 3 ? 'important' : 'reminder';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${urgency === 'urgent' ? '#EF4444' : urgency === 'important' ? '#F59E0B' : '#3B82F6'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Trial Expiring ${daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} Days`}</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>Your free trial is ${daysRemaining === 1 ? 'expiring tomorrow' : `expiring in ${daysRemaining} days`}.</p>
              <p><strong>Trial ends:</strong> ${trialEndDate}</p>
              <p>To continue using Mintenance after your trial, please subscribe to one of our plans:</p>
              <ul>
                <li><strong>Basic:</strong> £19.99/month - Perfect for getting started</li>
                <li><strong>Professional:</strong> £49.99/month - For growing businesses</li>
                <li><strong>Enterprise:</strong> £99.99/month - Unlimited access</li>
              </ul>
              <p>All plans include full platform access with a 5% transaction fee on payments.</p>
              <a href="${baseUrl}/contractor/subscription" class="button">Subscribe Now</a>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: `Trial Expiring ${daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} Days`} - Subscribe to Continue`,
        html,
      });
    } catch (err) {
      logger.error('Error sending trial expiration warning', {
        service: 'TrialNotifications',
        contractorId,
        daysRemaining,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Send subscription required notification
   */
  static async sendSubscriptionRequiredNotification(contractorId: string): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', contractorId)
        .single();

      if (!user || !user.email) {
        return false;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const contractorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Contractor';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Required</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>Your free trial has ended. To continue using Mintenance, please subscribe to one of our plans.</p>
              <p>Without a subscription, you'll have limited access to the platform.</p>
              <a href="${baseUrl}/contractor/subscription" class="button">Subscribe Now</a>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: 'Subscription Required - Continue Using Mintenance',
        html,
      });
    } catch (err) {
      logger.error('Error sending subscription required notification', {
        service: 'TrialNotifications',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Send subscription payment success notification
   */
  static async sendSubscriptionPaymentSuccess(
    contractorId: string,
    amount: number,
    planName: string
  ): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', contractorId)
        .single();

      if (!user || !user.email) {
        return false;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const contractorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Contractor';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Successful!</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>Your subscription payment of ${formatCurrency(amount)} for the ${planName} plan has been processed successfully.</p>
              <p>You now have full access to all features included in your plan.</p>
              <p>Thank you for being a valued Mintenance contractor!</p>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: 'Subscription Payment Successful',
        html,
      });
    } catch (err) {
      logger.error('Error sending subscription payment success notification', {
        service: 'TrialNotifications',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Send subscription payment failed notification
   */
  static async sendSubscriptionPaymentFailed(contractorId: string): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', contractorId)
        .single();

      if (!user || !user.email) {
        return false;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const contractorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Contractor';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>We were unable to process your subscription payment. Please update your payment method to continue using Mintenance.</p>
              <a href="${baseUrl}/contractor/subscription" class="button">Update Payment Method</a>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: 'Subscription Payment Failed - Action Required',
        html,
      });
    } catch (err) {
      logger.error('Error sending subscription payment failed notification', {
        service: 'TrialNotifications',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Create in-app notification for trial/subscription events
   */
  static async createInAppNotification(
    contractorId: string,
    title: string,
    body: string,
    type: 'system' = 'system'
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('notifications')
        .insert({
          user_id: contractorId,
          title,
          body,
          type,
          priority: 'normal',
          read: false,
        });

      if (error) {
        logger.error('Failed to create in-app notification', {
          service: 'TrialNotifications',
          contractorId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error creating in-app notification', {
        service: 'TrialNotifications',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

