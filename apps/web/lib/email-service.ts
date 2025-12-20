/**
 * Email Notification Service
 * Handles sending email notifications for quotes, bids, and other events
 */

import { logger } from '@mintenance/shared';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface QuoteEmailData {
  recipientName: string;
  contractorName: string;
  quoteNumber: string;
  totalAmount: number;
  viewUrl: string;
}

interface BidEmailData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  bidAmount: number;
  proposalExcerpt: string;
  viewUrl: string;
}

interface ConnectionRequestEmailData {
  recipientName: string;
  requesterName: string;
  requesterRole: string;
  acceptUrl: string;
}

/**
 * Email Service for sending notifications
 */
export class EmailService {
  private static apiKey = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;
  private static fromEmail = process.env.EMAIL_FROM || 'noreply@mintenance.com';
  private static fromName = process.env.EMAIL_FROM_NAME || 'Mintenance';

  /**
   * Send a generic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn('Email service not configured, skipping email send', {
        service: 'email',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      // Using SendGrid or Resend API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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

      if (!response.ok) {
        logger.error('Failed to send email', {
          service: 'email',
          status: response.status,
          to: options.to,
        });
        return false;
      }

      logger.info('Email sent successfully', {
        service: 'email',
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

  /**
   * Send quote notification to homeowner
   */
  static async sendQuoteNotification(
    recipientEmail: string,
    data: QuoteEmailData
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Quote Received</h1>
            </div>
            <div class="content">
              <p>Hi ${data.recipientName},</p>
              <p><strong>${data.contractorName}</strong> has sent you a new quote.</p>
              <p><strong>Quote Number:</strong> ${data.quoteNumber}</p>
              <p><strong>Total Amount:</strong> $${data.totalAmount.toFixed(2)}</p>
              <a href="${data.viewUrl}" class="button">View Quote</a>
              <p style="margin-top: 30px;">Log in to your Mintenance account to review the full details and accept or decline the quote.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${data.recipientName},

${data.contractorName} has sent you a new quote.

Quote Number: ${data.quoteNumber}
Total Amount: $${data.totalAmount.toFixed(2)}

View your quote here: ${data.viewUrl}

Log in to your Mintenance account to review the full details and accept or decline the quote.

© ${new Date().getFullYear()} Mintenance. All rights reserved.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `New Quote from ${data.contractorName} - ${data.quoteNumber}`,
      html,
      text,
    });
  }

  /**
   * Send bid notification to homeowner
   */
  static async sendBidNotification(
    recipientEmail: string,
    data: BidEmailData
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Bid on Your Job</h1>
            </div>
            <div class="content">
              <p>Hi ${data.homeownerName},</p>
              <p><strong>${data.contractorName}</strong> has submitted a bid for your job: <strong>${data.jobTitle}</strong></p>
              <p><strong>Bid Amount:</strong> $${data.bidAmount.toFixed(2)}</p>
              <p><strong>Proposal Preview:</strong></p>
              <p style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">${data.proposalExcerpt}...</p>
              <a href="${data.viewUrl}" class="button">View Full Bid</a>
              <p style="margin-top: 30px;">Review the contractor's full proposal, ratings, and past work to make an informed decision.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${data.homeownerName},

${data.contractorName} has submitted a bid for your job: ${data.jobTitle}

Bid Amount: $${data.bidAmount.toFixed(2)}

Proposal Preview:
${data.proposalExcerpt}...

View the full bid here: ${data.viewUrl}

Review the contractor's full proposal, ratings, and past work to make an informed decision.

© ${new Date().getFullYear()} Mintenance. All rights reserved.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `New Bid from ${data.contractorName} - ${data.jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send connection request notification
   */
  static async sendConnectionRequestNotification(
    recipientEmail: string,
    data: ConnectionRequestEmailData
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Connection Request</h1>
            </div>
            <div class="content">
              <p>Hi ${data.recipientName},</p>
              <p><strong>${data.requesterName}</strong> (${data.requesterRole}) wants to connect with you on Mintenance.</p>
              <a href="${data.acceptUrl}" class="button">View Request</a>
              <p style="margin-top: 30px;">Building connections helps you grow your network and find more opportunities.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${data.recipientName},

${data.requesterName} (${data.requesterRole}) wants to connect with you on Mintenance.

View the request here: ${data.acceptUrl}

Building connections helps you grow your network and find more opportunities.

© ${new Date().getFullYear()} Mintenance. All rights reserved.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `${data.requesterName} wants to connect with you`,
      html,
      text,
    });
  }

  /**
   * Send quote accepted notification to contractor
   */
  static async sendQuoteAcceptedNotification(
    contractorEmail: string,
    homeownerName: string,
    quoteNumber: string,
    amount: number
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Quote Accepted!</h1>
            </div>
            <div class="content">
              <p>Great news!</p>
              <p><strong>${homeownerName}</strong> has accepted your quote <strong>${quoteNumber}</strong> for <strong>$${amount.toFixed(2)}</strong>.</p>
              <p>Log in to your Mintenance account to coordinate the next steps with your client.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: contractorEmail,
      subject: `Quote Accepted - ${quoteNumber}`,
      html,
    });
  }
}
