import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Service for phone number verification via SMS using Supabase Auth
 * Uses Supabase's built-in SMS provider (TextLocal, Twilio, etc.)
 */
export class PhoneVerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 5;

  /**
   * Send SMS verification code to phone number using Supabase Auth SMS
   */
  static async sendVerificationCode(userId: string, phoneNumber: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      // Use Supabase Auth to send OTP via SMS
      // This uses the configured SMS provider (TextLocal, Twilio, etc.) in Supabase
      const { data, error } = await serverSupabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          channel: 'sms',
          // Don't create a new user if they don't exist
          shouldCreateUser: false,
        },
      });

      if (error) {
        logger.error('Failed to send SMS verification code via Supabase', {
          service: 'PhoneVerificationService',
          userId,
          phoneNumber: phoneNumber.substring(0, 4) + '****',
          error: error.message,
          errorCode: error.status,
        });

        // Check if it's a configuration error
        if (error.message?.includes('SMS provider') || 
            error.message?.includes('not configured') ||
            error.message?.includes('SMS service is not enabled')) {
          return { 
            success: false, 
            error: 'SMS provider not configured in Supabase. Please configure TextLocal or another provider in supabase/config.toml. See documentation for setup instructions.' 
          };
        }

        // Check if user doesn't exist (we're verifying existing users)
        if (error.message?.includes('User not found') || error.status === 400) {
          // Try with shouldCreateUser: true as fallback, but we'll handle verification differently
          logger.warn('User not found in auth.users, attempting alternative method', {
            service: 'PhoneVerificationService',
            userId,
          });
          
          // Fallback: Use Admin API directly
          return await this.sendSMSViaAdminAPI(phoneNumber);
        }

        return { 
          success: false, 
          error: `Failed to send verification code: ${error.message}` 
        };
      }

      // Store phone number in our users table for tracking
      await serverSupabase
        .from('users')
        .update({ phone: phoneNumber })
        .eq('id', userId);

      logger.info('Phone verification code sent via Supabase SMS', {
        service: 'PhoneVerificationService',
        userId,
        phoneNumber: phoneNumber.substring(0, 4) + '****',
        messageId: data?.messageId,
      });

      // In development mode, Supabase might not send actual SMS
      // Check if we're in dev mode and log accordingly
      if (process.env.NODE_ENV === 'development') {
        logger.info('Development mode: Check Supabase logs or Inbucket for OTP code', {
          service: 'PhoneVerificationService',
          phoneNumber: phoneNumber.substring(0, 4) + '****',
        });
        return { 
          success: true,
          devCode: 'Check Supabase logs or Inbucket email interface for OTP code',
        };
      }

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
   * Fallback: Send SMS via Supabase Admin API
   */
  private static async sendSMSViaAdminAPI(phoneNumber: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceKey) {
        return { 
          success: false, 
          error: 'Supabase configuration missing' 
        };
      }

      // Use Supabase Admin API to send OTP
      const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          phone: phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Supabase Admin OTP API failed', {
          service: 'PhoneVerificationService',
          status: response.status,
          error: errorData,
        });
        
        return { 
          success: false, 
          error: `Failed to send SMS: ${errorData.message || 'SMS provider not configured'}` 
        };
      }

      logger.info('SMS OTP sent via Supabase Admin API', {
        service: 'PhoneVerificationService',
        phoneNumber: phoneNumber.substring(0, 4) + '****',
      });

      if (process.env.NODE_ENV === 'development') {
        return { 
          success: true,
          devCode: 'Check Supabase logs or Inbucket for OTP code',
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error sending SMS via Admin API', error, {
        service: 'PhoneVerificationService',
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      };
    }
  }

  /**
   * Verify phone number with code using Supabase Auth
   */
  static async verifyCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's phone number
      const { data: user, error: fetchError } = await serverSupabase
        .from('users')
        .select('phone, phone_verified')
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

      if (!user.phone) {
        return { success: false, error: 'Phone number not found. Please request a new code.' };
      }

      // Verify OTP using Supabase Auth
      // Note: We need to get the phone number from auth.users or use the one from our users table
      // Supabase stores OTPs temporarily, so we verify against the phone number
      const { data: verifyData, error: verifyError } = await serverSupabase.auth.verifyOtp({
        phone: user.phone,
        token: code,
        type: 'sms',
      });

      if (verifyError) {
        logger.warn('Invalid phone verification code attempt', {
          service: 'PhoneVerificationService',
          userId,
          error: verifyError.message,
        });

        // Provide user-friendly error messages
        if (verifyError.message?.includes('expired') || verifyError.message?.includes('invalid')) {
          return { success: false, error: 'Invalid or expired verification code. Please request a new code.' };
        }

        return { success: false, error: verifyError.message || 'Invalid verification code' };
      }

      // Mark phone as verified in our users table
      const { error: updateError } = await serverSupabase
        .from('users')
        .update({
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
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

      logger.info('Phone number verified successfully via Supabase', {
        service: 'PhoneVerificationService',
        userId,
        phoneNumber: user.phone.substring(0, 4) + '****',
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

