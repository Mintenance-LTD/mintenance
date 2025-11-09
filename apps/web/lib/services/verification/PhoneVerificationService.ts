import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import crypto from 'crypto';

/**
 * Service for phone number verification via SMS
 */
export class PhoneVerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 5;
  private static readonly CODE_LENGTH = 6;

  /**
   * Generate a 6-digit verification code
   */
  private static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash verification code for storage
   */
  private static hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Send SMS verification code to phone number
   */
  static async sendVerificationCode(userId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate verification code
      const code = this.generateVerificationCode();
      const hashedCode = this.hashCode(code);
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // Store hashed code and expiry in database
      const { error: updateError } = await serverSupabase
        .from('users')
        .update({
          phone_verification_code: hashedCode,
          phone_verification_code_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('Failed to store phone verification code', {
          service: 'PhoneVerificationService',
          userId,
          error: updateError.message,
        });
        return { success: false, error: 'Failed to generate verification code' };
      }

      // Send SMS via Resend or Twilio
      const smsSent = await this.sendSMS(phoneNumber, code);

      if (!smsSent) {
        logger.error('Failed to send SMS verification code', {
          service: 'PhoneVerificationService',
          userId,
          phoneNumber: phoneNumber.substring(0, 4) + '****', // Partial masking
        });
        return { success: false, error: 'Failed to send verification code' };
      }

      logger.info('Phone verification code sent', {
        service: 'PhoneVerificationService',
        userId,
        phoneNumber: phoneNumber.substring(0, 4) + '****',
      });

      return { success: true };
    } catch (error) {
      logger.error('Error sending phone verification code', error, {
        service: 'PhoneVerificationService',
        userId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Verify phone number with code
   */
  static async verifyCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's stored verification code
      const { data: user, error: fetchError } = await serverSupabase
        .from('users')
        .select('phone_verification_code, phone_verification_code_expires_at, phone_verified')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        logger.error('Failed to fetch user for phone verification', {
          service: 'PhoneVerificationService',
          userId,
          error: fetchError?.message,
        });
        return { success: false, error: 'User not found' };
      }

      // Check if already verified
      if (user.phone_verified) {
        return { success: true }; // Already verified
      }

      // Check if code exists
      if (!user.phone_verification_code) {
        return { success: false, error: 'No verification code found. Please request a new code.' };
      }

      // Check if code expired
      if (!user.phone_verification_code_expires_at || new Date(user.phone_verification_code_expires_at) < new Date()) {
        return { success: false, error: 'Verification code has expired. Please request a new code.' };
      }

      // Verify code
      const hashedCode = this.hashCode(code);
      if (hashedCode !== user.phone_verification_code) {
        logger.warn('Invalid phone verification code attempt', {
          service: 'PhoneVerificationService',
          userId,
        });
        return { success: false, error: 'Invalid verification code' };
      }

      // Mark phone as verified
      const { error: updateError } = await serverSupabase
        .from('users')
        .update({
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          phone_verification_code: null, // Clear code after verification
          phone_verification_code_expires_at: null,
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('Failed to mark phone as verified', {
          service: 'PhoneVerificationService',
          userId,
          error: updateError.message,
        });
        return { success: false, error: 'Failed to verify phone number' };
      }

      logger.info('Phone number verified successfully', {
        service: 'PhoneVerificationService',
        userId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error verifying phone code', error, {
        service: 'PhoneVerificationService',
        userId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Send SMS via Resend or Twilio
   */
  private static async sendSMS(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Try Resend first (if configured)
      if (process.env.RESEND_API_KEY) {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Mintenance <noreply@mintenance.com>',
            to: phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@sms.resend.com`, // Resend SMS format
            subject: 'Mintenance Verification Code',
            html: `<p>Your Mintenance verification code is: <strong>${code}</strong></p><p>This code expires in ${this.CODE_EXPIRY_MINUTES} minutes.</p>`,
          }),
        });

        if (resendResponse.ok) {
          return true;
        }
      }

      // Fallback to Twilio if configured
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', phoneNumber);
        formData.append('From', process.env.TWILIO_PHONE_NUMBER);
        formData.append('Body', `Your Mintenance verification code is: ${code}. This code expires in ${this.CODE_EXPIRY_MINUTES} minutes.`);

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (twilioResponse.ok) {
          return true;
        }
      }

      // Development mode: log code instead of sending
      if (process.env.NODE_ENV === 'development') {
        logger.info('Phone verification code (dev mode)', {
          service: 'PhoneVerificationService',
          phoneNumber: phoneNumber.substring(0, 4) + '****',
          code,
        });
        return true; // Return true in dev mode
      }

      logger.warn('No SMS provider configured', {
        service: 'PhoneVerificationService',
      });
      return false;
    } catch (error) {
      logger.error('Error sending SMS', error, {
        service: 'PhoneVerificationService',
      });
      return false;
    }
  }

  /**
   * Check if user's phone is verified
   */
  static async isPhoneVerified(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await serverSupabase
        .from('users')
        .select('phone_verified')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      return user.phone_verified || false;
    } catch (error) {
      logger.error('Error checking phone verification status', error, {
        service: 'PhoneVerificationService',
        userId,
      });
      return false;
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user, error } = await serverSupabase
        .from('users')
        .select('phone')
        .eq('id', userId)
        .single();

      if (error || !user || !user.phone) {
        return { success: false, error: 'Phone number not found' };
      }

      return await this.sendVerificationCode(userId, user.phone);
    } catch (error) {
      logger.error('Error resending verification code', error, {
        service: 'PhoneVerificationService',
        userId,
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

