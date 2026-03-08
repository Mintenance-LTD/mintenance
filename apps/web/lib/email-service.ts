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
  private static baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

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

  /**
   * Send contract notification to homeowner when contractor creates/sends a contract
   */
  static async sendContractNotification(
    homeownerEmail: string,
    data: {
      homeownerName: string;
      contractorName: string;
      jobTitle: string;
      contractAmount: number;
      viewUrl: string;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d9488; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 28px; font-weight: bold; color: #0d9488; margin: 15px 0; }
            .cta { display: inline-block; background-color: #0d9488; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contract Ready for Review</h1>
            </div>
            <div class="content">
              <p>Hi ${data.homeownerName},</p>
              <p><strong>${data.contractorName}</strong> has sent you a contract for your job "<strong>${data.jobTitle}</strong>".</p>
              <p class="amount">&pound;${data.contractAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p>Please review the contract details and sign it to proceed with the work.</p>
              <p><a href="${data.viewUrl}" class="cta">Review &amp; Sign Contract</a></p>
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Payment will be held securely in escrow by Mintenance until the work is completed and approved.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has sent you a contract for "${data.jobTitle}" for £${data.contractAmount.toFixed(2)}.\n\nPlease review and sign: ${data.viewUrl}\n\n© ${new Date().getFullYear()} Mintenance.`;

    return this.sendEmail({
      to: homeownerEmail,
      subject: `Contract Ready for Review - ${data.jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send new message notification email
   */
  static async sendMessageNotification(
    recipientEmail: string,
    data: {
      recipientName: string;
      senderName: string;
      jobTitle: string;
      messagePreview: string;
      viewUrl: string;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d9488; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .message-box { background: white; border-left: 4px solid #0d9488; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .cta { display: inline-block; background-color: #0d9488; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Message</h1>
            </div>
            <div class="content">
              <p>Hi ${data.recipientName},</p>
              <p><strong>${data.senderName}</strong> sent you a message about "<strong>${data.jobTitle}</strong>":</p>
              <div class="message-box">
                <p style="margin: 0; color: #374151;">${data.messagePreview}</p>
              </div>
              <p><a href="${data.viewUrl}" class="cta">Reply Now</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${data.recipientName},\n\n${data.senderName} sent you a message about "${data.jobTitle}":\n\n"${data.messagePreview}"\n\nReply: ${data.viewUrl}\n\n© ${new Date().getFullYear()} Mintenance.`;

    return this.sendEmail({
      to: recipientEmail,
      subject: `New message from ${data.senderName} - ${data.jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send payment confirmation email to the homeowner
   */
  static async sendPaymentConfirmationEmail(
    homeownerEmail: string,
    data: {
      homeownerName: string;
      jobTitle: string;
      amount: number;
      contractorName: string;
      viewUrl: string;
    }
  ): Promise<boolean> {
    const fmtAmount = `£${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d9488; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount-box { background: white; border: 2px solid #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #0d9488; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .cta { display: inline-block; background-color: #0d9488; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }
            .escrow-note { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 12px 16px; border-radius: 4px; margin-top: 20px; font-size: 13px; color: #115e59; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Payment Confirmed</h1>
              <p style="margin:8px 0 0;opacity:0.9;">Your funds are secured in escrow</p>
            </div>
            <div class="content">
              <p>Hi ${data.homeownerName},</p>
              <p>Your payment has been successfully processed and the funds are now held securely in escrow.</p>
              <div class="amount-box">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px;">Amount Paid</div>
                <div class="amount">${fmtAmount}</div>
              </div>
              <div style="background:white;border-radius:8px;padding:16px;margin:16px 0;">
                <div class="detail-row"><span style="color:#6b7280;">Job</span><strong>${data.jobTitle}</strong></div>
                <div class="detail-row"><span style="color:#6b7280;">Contractor</span><strong>${data.contractorName}</strong></div>
                <div class="detail-row" style="border:none;"><span style="color:#6b7280;">Status</span><strong style="color:#0d9488;">Held in Escrow</strong></div>
              </div>
              <div class="escrow-note">
                <strong>How it works:</strong> Your payment is held safely until the contractor completes the work and you approve it. You're fully protected.
              </div>
              <p style="text-align:center;"><a href="${data.viewUrl}" class="cta">View Payment Details</a></p>
            </div>
            ${this.getUnsubscribeFooter()}
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${data.homeownerName},\n\nYour payment of ${fmtAmount} for "${data.jobTitle}" has been confirmed.\n\nContractor: ${data.contractorName}\nStatus: Held in Escrow\n\nView details: ${data.viewUrl}\n\n© ${new Date().getFullYear()} Mintenance.`;

    return this.sendEmail({
      to: homeownerEmail,
      subject: `Payment Confirmed - ${fmtAmount} for ${data.jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send payment received notification email to the contractor
   */
  static async sendPaymentReceivedEmail(
    contractorEmail: string,
    data: {
      contractorName: string;
      jobTitle: string;
      amount: number;
      homeownerName: string;
      viewUrl: string;
    }
  ): Promise<boolean> {
    const fmtAmount = `£${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d9488; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount-box { background: white; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #059669; }
            .cta { display: inline-block; background-color: #0d9488; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }
            .info-note { background: #f0fdf4; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 4px; margin-top: 20px; font-size: 13px; color: #166534; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Payment Secured</h1>
              <p style="margin:8px 0 0;opacity:0.9;">Funds are ready - you can start work</p>
            </div>
            <div class="content">
              <p>Hi ${data.contractorName},</p>
              <p>Great news! <strong>${data.homeownerName}</strong> has made a payment for your job. The funds are now held securely in escrow.</p>
              <div class="amount-box">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px;">Amount Secured</div>
                <div class="amount">${fmtAmount}</div>
                <div style="font-size:13px;color:#6b7280;margin-top:4px;">for "${data.jobTitle}"</div>
              </div>
              <div class="info-note">
                <strong>Next steps:</strong> You can now start work on this job. Upload before-photos and click "Start Job" when you're ready. Payment will be released once the homeowner approves the completed work.
              </div>
              <p style="text-align:center;"><a href="${data.viewUrl}" class="cta">View Job Details</a></p>
            </div>
            ${this.getUnsubscribeFooter()}
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${data.contractorName},\n\n${data.homeownerName} has made a payment of ${fmtAmount} for "${data.jobTitle}". Funds are held in escrow.\n\nYou can now start work. View details: ${data.viewUrl}\n\n© ${new Date().getFullYear()} Mintenance.`;

    return this.sendEmail({
      to: contractorEmail,
      subject: `Payment Secured - ${fmtAmount} for ${data.jobTitle}`,
      html,
      text,
    });
  }
}
