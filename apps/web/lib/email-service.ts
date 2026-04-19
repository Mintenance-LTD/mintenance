/**
 * Email Notification Service
 * Handles sending email notifications for quotes, bids, and other events.
 * HTML template bodies live in ./email-templates.ts
 */

import { logger } from '@mintenance/shared';
import { env } from './env';
import {
  escapeHtml,
  quoteNotificationTemplate,
  bidNotificationTemplate,
  connectionRequestTemplate,
  quoteAcceptedTemplate,
  contractNotificationTemplate,
  messageNotificationTemplate,
  paymentConfirmationTemplate,
  paymentReceivedTemplate,
  bidAcceptedTemplate,
  contractSignedTemplate,
  jobStartedTemplate,
  jobCompletedTemplate,
  locationSharingTemplate,
  workApprovedTemplate,
  changesRequestedTemplate,
  paymentReleasedTemplate,
  invoiceNotificationTemplate,
  newsletterWelcomeTemplate,
  tenantInviteTemplate,
  tenantJobNotificationTemplate,
  cashFlowDigestTemplate,
  annualHomeMOTTemplate,
  postJobNudgeTemplate,
} from './email-templates';
// Re-export data interfaces for consumers that import them from this module
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Service for sending notifications
 */
export class EmailService {
  // Sprint 7 (5.4): env values come from the validated `env` object in
  // lib/env.ts rather than raw process.env, so defaults + shape are
  // documented in one place and the schema fails fast if misconfigured
  // in production.
  private static brevoKey = env.BREVO_API_KEY;
  private static sendgridKey = env.SENDGRID_API_KEY;
  private static resendKey = env.RESEND_API_KEY;
  private static fromEmail = env.EMAIL_FROM;
  private static fromName = env.EMAIL_FROM_NAME;
  private static baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

  /** Escape HTML special characters to prevent XSS in email templates */
  private static escapeHtml = escapeHtml;

  /**
   * Generate GDPR-compliant unsubscribe footer for emails
   */
  static getUnsubscribeFooter(unsubscribeToken?: string): string {
    if (!unsubscribeToken) {
      return `<p style="margin-top:30px;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Mintenance. All rights reserved.</p>`;
    }
    const unsubUrl = `${this.baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
    return `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      <p>&copy; ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p>You received this email because you have a Mintenance account.</p>
      <p><a href="${unsubUrl}" style="color:#6b7280;">Unsubscribe</a> | <a href="${this.baseUrl}/settings/notifications" style="color:#6b7280;">Email preferences</a></p>
    </div>`;
  }

  /**
   * Send a generic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    // Priority: Brevo (free 300/day) > SendGrid > Resend
    const provider = this.brevoKey
      ? 'brevo'
      : this.sendgridKey
        ? 'sendgrid'
        : this.resendKey
          ? 'resend'
          : null;

    if (!provider) {
      logger.warn('Email service not configured, skipping email send', {
        service: 'email',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      let response: Response;

      if (provider === 'brevo') {
        // Brevo (formerly Sendinblue) — 300 free emails/day
        response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': this.brevoKey!,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: this.fromName, email: this.fromEmail },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || undefined,
          }),
        });
      } else if (provider === 'resend') {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });
      } else {
        // SendGrid
        response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: options.to }] }],
            from: { email: this.fromEmail, name: this.fromName },
            subject: options.subject,
            content: [
              { type: 'text/plain', value: options.text || options.html },
              { type: 'text/html', value: options.html },
            ],
          }),
        });
      }

      if (!response.ok) {
        logger.error('Failed to send email', {
          service: 'email',
          provider,
          status: response.status,
          to: options.to,
        });
        return false;
      }

      logger.info('Email sent successfully', {
        service: 'email',
        provider,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Email send error', error, {
        service: 'email',
        to: options.to,
      });
      return false;
    }
  }

  /** Send quote notification to homeowner */
  static async sendQuoteNotification(
    recipientEmail: string,
    data: Parameters<typeof quoteNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = quoteNotificationTemplate(data);
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  }

  /** Send bid notification to homeowner */
  static async sendBidNotification(
    recipientEmail: string,
    data: Parameters<typeof bidNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = bidNotificationTemplate(data);
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  }

  /** Send connection request notification */
  static async sendConnectionRequestNotification(
    recipientEmail: string,
    data: Parameters<typeof connectionRequestTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = connectionRequestTemplate(data);
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  }

  /** Send quote accepted notification to contractor */
  static async sendQuoteAcceptedNotification(
    contractorEmail: string,
    homeownerName: string,
    quoteNumber: string,
    amount: number
  ): Promise<boolean> {
    const { subject, html } = quoteAcceptedTemplate(
      homeownerName,
      quoteNumber,
      amount
    );
    return this.sendEmail({ to: contractorEmail, subject, html });
  }

  /** Send contract notification to homeowner when contractor creates/sends a contract */
  static async sendContractNotification(
    homeownerEmail: string,
    data: Parameters<typeof contractNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = contractNotificationTemplate(data);
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /** Send new message notification email */
  static async sendMessageNotification(
    recipientEmail: string,
    data: Parameters<typeof messageNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = messageNotificationTemplate(data);
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  }

  /** Send payment confirmation email to the homeowner */
  static async sendPaymentConfirmationEmail(
    homeownerEmail: string,
    data: Parameters<typeof paymentConfirmationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = paymentConfirmationTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /**
   * Send Friday cash-flow digest to a contractor.
   * R2 #16 of docs/RETENTION_ROADMAP_2026.md.
   */
  static async sendCashFlowDigestEmail(
    contractorEmail: string,
    data: Parameters<typeof cashFlowDigestTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = cashFlowDigestTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /**
   * Send Annual Home MOT email to a homeowner.
   * R5 #6 of docs/RETENTION_ROADMAP_2026.md.
   */
  static async sendAnnualHomeMOTEmail(
    homeownerEmail: string,
    data: Parameters<typeof annualHomeMOTTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = annualHomeMOTTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /**
   * Send +90-day post-job nudge to a homeowner.
   * R5 #7 of docs/RETENTION_ROADMAP_2026.md.
   */
  static async sendPostJobNudgeEmail(
    homeownerEmail: string,
    data: Parameters<typeof postJobNudgeTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = postJobNudgeTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /** Send payment received notification email to the contractor */
  static async sendPaymentReceivedEmail(
    contractorEmail: string,
    data: Parameters<typeof paymentReceivedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = paymentReceivedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /** Send bid accepted notification to contractor */
  static async sendBidAcceptedEmail(
    contractorEmail: string,
    data: Parameters<typeof bidAcceptedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = bidAcceptedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /** Send contract signed notification to the other party */
  static async sendContractSignedEmail(
    recipientEmail: string,
    data: Parameters<typeof contractSignedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = contractSignedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: recipientEmail, subject, html, text });
  }

  /** Send job started notification to homeowner */
  static async sendJobStartedEmail(
    homeownerEmail: string,
    data: Parameters<typeof jobStartedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = jobStartedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /** Send job completed notification to homeowner (review required) */
  static async sendJobCompletedEmail(
    homeownerEmail: string,
    data: Parameters<typeof jobCompletedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = jobCompletedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /** Send location sharing enabled notification to homeowner */
  static async sendLocationSharingEmail(
    homeownerEmail: string,
    data: Parameters<typeof locationSharingTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = locationSharingTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: homeownerEmail, subject, html, text });
  }

  /** Send work approved / payment releasing notification to contractor */
  static async sendWorkApprovedEmail(
    contractorEmail: string,
    data: Parameters<typeof workApprovedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = workApprovedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /** Send changes requested notification to contractor */
  static async sendChangesRequestedEmail(
    contractorEmail: string,
    data: Parameters<typeof changesRequestedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = changesRequestedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /** Send payment released notification to contractor */
  static async sendPaymentReleasedEmail(
    contractorEmail: string,
    data: Parameters<typeof paymentReleasedTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = paymentReleasedTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: contractorEmail, subject, html, text });
  }

  /** Send invoice notification email to homeowner/client */
  static async sendInvoiceNotificationEmail(
    clientEmail: string,
    data: Parameters<typeof invoiceNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = invoiceNotificationTemplate(
      data,
      this.getUnsubscribeFooter()
    );
    return this.sendEmail({ to: clientEmail, subject, html, text });
  }

  /** Send tenant invitation email */
  static async sendTenantInviteEmail(
    tenantEmail: string,
    data: Parameters<typeof tenantInviteTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = tenantInviteTemplate(data);
    return this.sendEmail({ to: tenantEmail, subject, html, text });
  }

  /** Send tenant job status notification */
  static async sendTenantJobNotification(
    tenantEmail: string,
    data: Parameters<typeof tenantJobNotificationTemplate>[0]
  ): Promise<boolean> {
    const { subject, html, text } = tenantJobNotificationTemplate(data);
    return this.sendEmail({ to: tenantEmail, subject, html, text });
  }

  /** Send newsletter welcome/confirmation email */
  static async sendNewsletterWelcomeEmail(
    subscriberEmail: string
  ): Promise<boolean> {
    const { subject, html, text } = newsletterWelcomeTemplate(subscriberEmail);
    return this.sendEmail({ to: subscriberEmail, subject, html, text });
  }
}
