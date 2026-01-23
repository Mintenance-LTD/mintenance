/**
 * Email Service - Send emails with templates via SendGrid
 */
import { NotificationType } from './types';
import { logger } from '@mintenance/shared';
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  sandboxMode?: boolean;
}
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
}
interface EmailRecipient {
  email: string;
  name?: string;
  userId?: string;
}
interface SendEmailParams {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
  }>;
  categories?: string[];
  sendAt?: Date;
  batchId?: string;
}
export class EmailService {
  private config: EmailConfig;
  private supabase: unknown;
  private sgMail: unknown; // SendGrid client
  constructor(config: { supabase: unknown; sendgridConfig: EmailConfig }) {
    this.config = config.sendgridConfig;
    this.supabase = config.supabase;
    // Initialize SendGrid client (mocked for now)
    this.sgMail = {
      setApiKey: (key: string) => {},
      send: async (msg: unknown) => ({ messageId: 'mock-id' })
    };
    if (this.config.apiKey) {
      this.sgMail.setApiKey(this.config.apiKey);
    }
  }
  /**
   * Send a notification email
   */
  async sendNotificationEmail(params: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get recipient details
      const recipient = await this.getRecipientDetails(params.recipientId);
      if (!recipient.email) {
        throw new Error('Recipient email not found');
      }
      // Get template for this notification type
      const template = await this.getTemplateForType(params.type);
      // Prepare template data
      const templateData = {
        recipientName: recipient.name || 'User',
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        actionText: this.getActionText(params.type),
        currentYear: new Date().getFullYear(),
        ...params.metadata
      };
      // Send email
      const result = await this.sendEmail({
        to: recipient,
        subject: params.title,
        templateId: template?.id,
        templateData,
        categories: [params.type, 'notification']
      });
      // Log email sent
      await this.logEmailSent({
        recipientId: params.recipientId,
        type: 'notification',
        templateId: template?.id,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
      return result;
    } catch (error: unknown) {
      logger.error('Error sending notification email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }
  /**
   * Send email with custom content or template
   */
  async sendEmail(params: SendEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Prepare SendGrid message
      const msg: unknown = {
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName || 'Mintenance'
        },
        personalizations: this.buildPersonalizations(params),
        subject: params.subject,
        categories: params.categories
      };
      // Add reply-to if configured
      if (this.config.replyTo) {
        msg.replyTo = { email: this.config.replyTo };
      }
      // Add content
      if (params.templateId) {
        msg.templateId = params.templateId;
      } else {
        if (params.html) {
          msg.content = msg.content || [];
          msg.content.push({
            type: 'text/html',
            value: params.html
          });
        }
        if (params.text) {
          msg.content = msg.content || [];
          msg.content.push({
            type: 'text/plain',
            value: params.text
          });
        }
      }
      // Add attachments
      if (params.attachments && params.attachments.length > 0) {
        msg.attachments = params.attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: att.disposition || 'attachment'
        }));
      }
      // Set send time if scheduled
      if (params.sendAt) {
        msg.sendAt = Math.floor(params.sendAt.getTime() / 1000);
      }
      // Set batch ID for tracking
      if (params.batchId) {
        msg.batchId = params.batchId;
      }
      // Enable sandbox mode if configured
      if (this.config.sandboxMode) {
        msg.mailSettings = {
          sandboxMode: { enable: true }
        };
      }
      // Send via SendGrid
      const response = await this.sgMail.send(msg);
      return {
        success: true,
        messageId: response.messageId || response[0]?.messageId
      };
    } catch (error: unknown) {
      logger.error('SendGrid error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }
  /**
   * Send bulk emails
   */
  async sendBulkEmails(params: {
    recipients: EmailRecipient[];
    subject: string;
    templateId?: string;
    templateData?: Record<string, any>;
    categories?: string[];
    batchSize?: number;
  }): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const batchSize = params.batchSize || 100;
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>
    };
    // Process in batches
    for (let i = 0; i < params.recipients.length; i += batchSize) {
      const batch = params.recipients.slice(i, i + batchSize);
      try {
        const batchResult = await this.sendEmail({
          to: batch,
          subject: params.subject,
          templateId: params.templateId,
          templateData: params.templateData,
          categories: params.categories,
          batchId: `bulk-${Date.now()}-${i}`
        });
        if (batchResult.success) {
          results.sent += batch.length;
        } else {
          results.failed += batch.length;
          batch.forEach(r => {
            results.errors.push({
              email: r.email,
              error: batchResult.error || 'Unknown error'
            });
          });
        }
      } catch (error: unknown) {
        logger.error(`Error sending batch ${i}:`, error);
        results.failed += batch.length;
        batch.forEach(r => {
          results.errors.push({
            email: r.email,
            error: error.message || 'Batch send failed'
          });
        });
      }
      // Rate limit between batches
      if (i + batchSize < params.recipients.length) {
        await this.sleep(1000); // 1 second delay
      }
    }
    return results;
  }
  /**
   * Get or create email template
   */
  async getTemplateForType(type: NotificationType): Promise<EmailTemplate | null> {
    try {
      const { data } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('notification_type', type)
        .eq('active', true)
        .single();
      if (!data) {
        // Return default template
        return this.getDefaultTemplate(type);
      }
      return {
        id: data.id,
        name: data.name,
        subject: data.subject,
        htmlContent: data.html_content,
        textContent: data.text_content,
        variables: data.variables
      };
    } catch (error: unknown) {
      logger.error('Error getting email template:', error);
      return this.getDefaultTemplate(type);
    }
  }
  // ============= Private Helper Methods =============
  private async getRecipientDetails(userId: string): Promise<EmailRecipient> {
    try {
      const { data } = await this.supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();
      if (!data) {
        throw new Error('User not found');
      }
      return {
        email: data.email,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        userId
      };
    } catch (error: unknown) {
      logger.error('Error getting recipient details:', error);
      throw error;
    }
  }
  private buildPersonalizations(params: SendEmailParams): unknown[] {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    return [{
      to: recipients.map(r => ({
        email: r.email,
        name: r.name
      })),
      dynamicTemplateData: params.templateData
    }];
  }
  private getActionText(type: NotificationType): string {
    const actionMap: Record<NotificationType, string> = {
      [NotificationType.JOB_CREATED]: 'View Job',
      [NotificationType.JOB_ASSIGNED]: 'View Job Details',
      [NotificationType.JOB_COMPLETED]: 'Leave a Review',
      [NotificationType.BID_RECEIVED]: 'Review Bid',
      [NotificationType.BID_ACCEPTED]: 'View Contract',
      [NotificationType.BID_REJECTED]: 'View Other Jobs',
      [NotificationType.PAYMENT_RECEIVED]: 'View Payment',
      [NotificationType.PAYMENT_RELEASED]: 'View Payment',
      [NotificationType.MESSAGE_RECEIVED]: 'Read Message',
      [NotificationType.REVIEW_REQUESTED]: 'Write Review',
      [NotificationType.REVIEW_RECEIVED]: 'View Review',
      [NotificationType.CONTRACT_SIGNED]: 'View Contract',
      [NotificationType.MILESTONE_COMPLETED]: 'View Milestone',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Learn More'
    };
    return actionMap[type] || 'View Details';
  }
  private getDefaultTemplate(type: NotificationType): EmailTemplate {
    return {
      id: 'default',
      name: 'Default Notification',
      subject: '{{title}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hi {{recipientName}},</h2>
            <p>{{message}}</p>
            {{#if actionUrl}}
            <p>
              <a href="{{actionUrl}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                {{actionText}}
              </a>
            </p>
            {{/if}}
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              © {{currentYear}} Mintenance. All rights reserved.
            </p>
          </body>
        </html>
      `,
      variables: ['title', 'recipientName', 'message', 'actionUrl', 'actionText', 'currentYear']
    };
  }
  private async logEmailSent(params: {
    recipientId: string;
    type: string;
    templateId?: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('email_logs')
        .insert({
          recipient_id: params.recipientId,
          type: params.type,
          template_id: params.templateId,
          success: params.success,
          message_id: params.messageId,
          error_message: params.error,
          sent_at: new Date().toISOString()
        });
    } catch (error: unknown) {
      logger.error('Error logging email:', error);
    }
  }
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}