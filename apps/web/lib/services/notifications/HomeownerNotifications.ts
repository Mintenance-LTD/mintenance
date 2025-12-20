import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';

/**
 * Service for sending homeowner-related notifications
 */
export class HomeownerNotifications {
  /**
   * Send welcome email when homeowner registers
   */
  static async sendWelcomeEmail(homeownerId: string): Promise<boolean> {
    try {
      const { data: user } = await serverSupabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', homeownerId)
        .single();

      if (!user || !user.email) {
        logger.warn('Cannot send homeowner welcome email - user not found', {
          service: 'HomeownerNotifications',
          homeownerId,
        });
        return false;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const homeownerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Homeowner';

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
            .feature-list { margin: 20px 0; padding-left: 0; list-style: none; }
            .feature-list li { padding: 10px 0; padding-left: 30px; position: relative; }
            .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #10B981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Mintenance!</h1>
            </div>
            <div class="content">
              <p>Hi ${homeownerName},</p>
              <p>Welcome to Mintenance! We're excited to help you connect with trusted, verified contractors for your home maintenance and improvement projects.</p>
              
              <p><strong>Get started in just a few simple steps:</strong></p>
              
              <ul class="feature-list">
                <li><strong>Post Your First Job</strong> - Describe your project and get matched with qualified contractors in your area</li>
                <li><strong>Review Bids</strong> - Compare quotes, read reviews, and view contractor portfolios</li>
                <li><strong>Choose Your Contractor</strong> - Select the best fit for your project and budget</li>
                <li><strong>Manage Everything</strong> - Track progress, communicate, and handle payments all in one place</li>
              </ul>
              
              <p>All contractors on Mintenance are verified and rated, so you can hire with confidence.</p>
              
              <a href="${baseUrl}/jobs/create" class="button">Post Your First Job</a>
              
              <p style="margin-top: 30px;">Need help getting started? Check out our <a href="${baseUrl}/help" style="color: #0F172A;">help center</a> or contact our support team.</p>
            </div>
            <div class="footer">
              <p>Questions? Contact us at support@mintenance.com</p>
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await EmailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Mintenance - Your Home Maintenance Platform',
        html,
      });
    } catch (err) {
      logger.error('Error sending homeowner welcome email', {
        service: 'HomeownerNotifications',
        homeownerId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}

