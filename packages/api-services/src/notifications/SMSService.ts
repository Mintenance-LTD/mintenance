import { logger } from '@mintenance/shared';

/**
 * SMS Service - Send SMS notifications via Twilio
 */
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  fromNumber?: string;
}
interface SMSRecipient {
  phoneNumber: string;
  userId?: string;
  name?: string;
}
interface SendSMSParams {
  to: string | string[];
  message: string;
  mediaUrl?: string[];
  scheduledFor?: Date;
  validityPeriod?: number; // seconds
  maxPrice?: string;
  attempt?: number;
  statusCallback?: string;
}
export class SMSService {
  private config: TwilioConfig;
  private supabase: any;
  private twilioClient: any; // Twilio client
  constructor(config: { supabase: any; twilioConfig: TwilioConfig }) {
    this.config = config.twilioConfig;
    this.supabase = config.supabase;
    // Initialize Twilio client (mocked for now)
    this.twilioClient = {
      messages: {
        create: async (params: any) => ({
          sid: 'mock-sid',
          status: 'sent',
          to: params.to,
          from: params.from,
          body: params.body
        })
      }
    };
  }
  /**
   * Send notification SMS
   */
  async sendNotificationSMS(params: {
    recipientId: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get recipient phone number
      const recipient = await this.getRecipientPhone(params.recipientId);
      if (!recipient.phoneNumber) {
        throw new Error('Recipient phone number not found');
      }
      // Format and validate phone number
      const formattedPhone = this.formatPhoneNumber(recipient.phoneNumber);
      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format');
      }
      // Check SMS opt-in status
      const optedIn = await this.checkSMSOptIn(params.recipientId);
      if (!optedIn) {
        return {
          success: false,
          error: 'User has not opted in to SMS notifications'
        };
      }
      // Send SMS
      const result = await this.sendSMS({
        to: formattedPhone,
        message: this.formatMessage(params.message)
      });
      // Log SMS sent
      await this.logSMSSent({
        recipientId: params.recipientId,
        phoneNumber: formattedPhone,
        message: params.message,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
      return result;
    } catch (error: any) {
      logger.error('Error sending notification SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }
  /**
   * Send SMS message
   */
  async sendSMS(params: SendSMSParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    status?: string;
  }> {
    try {
      const recipients = Array.isArray(params.to) ? params.to : [params.to];
      const results = [];
      for (const recipient of recipients) {
        try {
          // Prepare message parameters
          const messageParams: any = {
            to: recipient,
            body: params.message
          };
          // Set from number or messaging service
          if (this.config.messagingServiceSid) {
            messageParams.messagingServiceSid = this.config.messagingServiceSid;
          } else if (this.config.fromNumber) {
            messageParams.from = this.config.fromNumber;
          } else {
            throw new Error('No from number or messaging service configured');
          }
          // Add media URLs if provided (MMS)
          if (params.mediaUrl && params.mediaUrl.length > 0) {
            messageParams.mediaUrl = params.mediaUrl;
          }
          // Schedule message if requested
          if (params.scheduledFor) {
            messageParams.sendAt = params.scheduledFor.toISOString();
            messageParams.scheduleType = 'fixed';
          }
          // Set validity period
          if (params.validityPeriod) {
            messageParams.validityPeriod = params.validityPeriod;
          }
          // Set max price limit
          if (params.maxPrice) {
            messageParams.maxPrice = params.maxPrice;
          }
          // Set status callback URL
          if (params.statusCallback) {
            messageParams.statusCallback = params.statusCallback;
          }
          // Send via Twilio
          const message = await this.twilioClient.messages.create(messageParams);
          results.push({
            success: true,
            messageId: message.sid,
            status: message.status
          });
        } catch (recipientError: any) {
          logger.error(`Error sending SMS to ${recipient}:`, recipientError);
          results.push({
            success: false,
            error: recipientError.message
          });
        }
      }
      // Return first result for single recipient, or aggregate for multiple
      if (recipients.length === 1) {
        return results[0];
      }
      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        messageId: results.find(r => r.success)?.messageId,
        error: successCount === 0 ? 'All messages failed' : undefined,
        status: `${successCount}/${recipients.length} sent`
      };
    } catch (error: any) {
      logger.error('Twilio error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }
  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(params: {
    recipients: SMSRecipient[];
    message: string;
    batchSize?: number;
    delayMs?: number;
  }): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ phoneNumber: string; error: string }>;
  }> {
    const batchSize = params.batchSize || 10;
    const delayMs = params.delayMs || 100;
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ phoneNumber: string; error: string }>
    };
    // Process in batches to avoid rate limits
    for (let i = 0; i < params.recipients.length; i += batchSize) {
      const batch = params.recipients.slice(i, i + batchSize);
      // Send batch in parallel
      const batchPromises = batch.map(async recipient => {
        try {
          const result = await this.sendSMS({
            to: recipient.phoneNumber,
            message: params.message
          });
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({
              phoneNumber: recipient.phoneNumber,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            phoneNumber: recipient.phoneNumber,
            error: error.message || 'Send failed'
          });
        }
      });
      await Promise.all(batchPromises);
      // Delay between batches
      if (i + batchSize < params.recipients.length) {
        await this.sleep(delayMs);
      }
    }
    return results;
  }
  /**
   * Send OTP code via SMS
   */
  async sendOTP(phoneNumber: string, code: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const message = `Your Mintenance verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      validityPeriod: 600 // 10 minutes
    });
  }
  /**
   * Check SMS delivery status
   */
  async checkDeliveryStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // Would use Twilio API to check status
      // For now, return mock status
      return {
        status: 'delivered'
      };
    } catch (error: any) {
      logger.error('Error checking delivery status:', error);
      return {
        status: 'unknown',
        errorMessage: error.message
      };
    }
  }
  // ============= Private Helper Methods =============
  private async getRecipientPhone(userId: string): Promise<SMSRecipient> {
    try {
      const { data } = await this.supabase
        .from('users')
        .select('phone_number, first_name, last_name')
        .eq('id', userId)
        .single();
      if (!data || !data.phone_number) {
        throw new Error('Phone number not found');
      }
      return {
        phoneNumber: data.phone_number,
        userId,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim()
      };
    } catch (error: any) {
      logger.error('Error getting recipient phone:', error);
      throw error;
    }
  }
  private async checkSMSOptIn(userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('sms_opt_in, notification_preferences')
        .eq('user_id', userId)
        .single();
      // Check both explicit opt-in and notification preferences
      return data?.sms_opt_in === true ||
             data?.notification_preferences?.sms === true;
    } catch (error: any) {
      logger.error('Error checking SMS opt-in:', error);
      return false;
    }
  }
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    // Add country code if missing
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned; // Assume US
    }
    // Format as E.164
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    return '+' + cleaned;
  }
  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 validation
    const e164Pattern = /^\+[1-9]\d{10,14}$/;
    return e164Pattern.test(phone);
  }
  private formatMessage(message: string): string {
    // Ensure message fits SMS limits
    const maxLength = 1600; // SMS concatenation limit
    if (message.length <= maxLength) {
      return message;
    }
    // Truncate and add ellipsis
    return message.substring(0, maxLength - 3) + '...';
  }
  private async logSMSSent(params: {
    recipientId: string;
    phoneNumber: string;
    message: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('sms_logs')
        .insert({
          recipient_id: params.recipientId,
          phone_number: params.phoneNumber,
          message: params.message.substring(0, 500), // Truncate for storage
          success: params.success,
          message_sid: params.messageId,
          error_message: params.error,
          sent_at: new Date().toISOString()
        });
    } catch (error: any) {
      logger.error('Error logging SMS:', error);
    }
  }
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}