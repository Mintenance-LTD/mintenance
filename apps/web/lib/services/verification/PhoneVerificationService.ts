import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import twilio from 'twilio';

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
      // Check if user exists in auth.users first
      const { data: authUser, error: authUserError } = await serverSupabase.auth.admin.getUserById(userId);

      // If user exists but doesn't have phone in auth.users, update it first
      if (authUser?.user && !authUser.user.phone) {
        await serverSupabase.auth.admin.updateUserById(userId, {
          phone: phoneNumber,
        });
      }

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

        // Check if signups are disabled, user doesn't exist, timeout, or other errors - use Admin API fallback
        if (error.message?.includes('Signups not allowed') || 
            error.message?.includes('User not found') || 
            error.status === 400 || 
            error.status === 422 ||
            error.status === 504 ||
            !error.message ||
            error.message === '{}') {
          logger.warn('signInWithOtp failed, using Admin API fallback', {
            service: 'PhoneVerificationService',
            userId,
            errorMessage: error.message,
            errorStatus: error.status,
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
        .from('profiles')
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
        
        // If Admin API times out (504), try Twilio Verify as fallback
        if (response.status === 504 || response.status === 408) {
          logger.warn('Supabase Admin API timed out, trying Twilio Verify fallback', {
            service: 'PhoneVerificationService',
            phoneNumber: phoneNumber.substring(0, 4) + '****',
          });

          return await this.sendSMSViaTwilioVerify(phoneNumber);
        }
        
        // Check if it's a Twilio error that indicates we should bypass Supabase and use Twilio Verify directly
        const errorMsg = errorData.msg || errorData.message || '';
        const errorCode = errorData.error_code || '';
        
        // Detect Twilio errors that indicate Supabase configuration issues
        // Error codes: 20003 (Auth), 21212 (Invalid From Number), 20404 (Resource Not Found)
        const isTwilioAuthError = errorMsg.includes('Authenticate') || errorMsg.includes('20003');
        const isTwilioConfigError = errorMsg.includes('Invalid From Number') || 
                                   errorMsg.includes('21212') ||
                                   (errorMsg.includes('Invalid') && errorMsg.includes('caller ID'));
        const isTwilioResourceError = errorMsg.includes('20404') || 
                                     errorMsg.includes('not found') ||
                                     errorMsg.includes('/Messages.json');
        const isAnyTwilioError = errorMsg.includes('twilio.com') || 
                                errorMsg.includes('Twilio') ||
                                /^\d{5}$/.test(errorCode); // Twilio error codes are 5 digits
        
        if (isTwilioAuthError || isTwilioConfigError || isTwilioResourceError || isAnyTwilioError) {
          logger.warn('Twilio error in Supabase configuration, trying Twilio Verify fallback', {
            service: 'PhoneVerificationService',
            phoneNumber: phoneNumber.substring(0, 4) + '****',
            error: errorMsg,
            errorCode,
            errorType: isTwilioAuthError ? 'auth' : isTwilioConfigError ? 'config' : isTwilioResourceError ? 'resource' : 'other',
          });
          
          return await this.sendSMSViaTwilioVerify(phoneNumber);
        }
        
        // Provide specific error messages based on status code
        let errorMessage = 'Failed to send SMS';
        if (response.status === 400 || response.status === 422) {
          errorMessage = errorData.msg || errorData.message || 'SMS provider not configured. Please configure TextLocal or another provider in Supabase settings.';
        } else if (errorData.message) {
          errorMessage = `Failed to send SMS: ${errorData.message}`;
        } else {
          errorMessage = 'SMS provider not configured or service unavailable. Please check your Supabase SMS provider configuration.';
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      const responseData = await response.json().catch(() => ({}));

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
   * Fallback: Send SMS via Twilio Verify API directly
   */
  private static async sendSMSViaTwilioVerify(phoneNumber: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (!accountSid || !authToken || !verifyServiceSid) {
        logger.warn('Twilio Verify credentials not configured', {
          service: 'PhoneVerificationService',
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasVerifyServiceSid: !!verifyServiceSid,
        });
        return { 
          success: false, 
          error: 'SMS service timed out. Twilio Verify fallback not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID environment variables.' 
        };
      }

      // Sanitize token: remove ALL whitespace including newlines, carriage returns, tabs, etc.
      const sanitizedToken = authToken?.replace(/\s+/g, '').replace(/[\r\n\t]/g, '');
      const originalLength = authToken?.length;
      const sanitizedLength = sanitizedToken?.length;
      const hasWhitespace = authToken && authToken !== sanitizedToken;
      const hasNewlines = authToken && (authToken.includes('\n') || authToken.includes('\r'));
      const tokenFormatValid = sanitizedToken && sanitizedToken.length === 32 && /^[a-zA-Z0-9]{32}$/.test(sanitizedToken);

      // Use sanitized token (removes all whitespace, newlines, etc.)
      const cleanAuthToken = sanitizedToken || authToken;
      
      if (!tokenFormatValid) {
        logger.error('Twilio Auth Token format is invalid', {
          service: 'PhoneVerificationService',
          originalLength,
          sanitizedLength,
          hasWhitespace,
          hasNewlines,
          expectedLength: 32,
        });
        return { 
          success: false, 
          error: `Twilio Auth Token format is invalid. Expected exactly 32 alphanumeric characters, but got ${sanitizedLength} after sanitization. Please check your TWILIO_AUTH_TOKEN in .env.local and ensure there are no extra spaces, newlines, or special characters.` 
        };
      }
      const client = twilio(accountSid, cleanAuthToken);

      const verification = await client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: phoneNumber, channel: 'sms' });

      logger.info('SMS OTP sent via Twilio Verify', {
        service: 'PhoneVerificationService',
        phoneNumber: phoneNumber.substring(0, 4) + '****',
        verificationSid: verification.sid,
      });

      return { success: true };
    } catch (error: unknown) {
      logger.error('Error sending SMS via Twilio Verify', error, {
        service: 'PhoneVerificationService',
        errorCode: error?.code,
        errorStatus: error?.status,
        errorMessage: error?.message,
      });

      // Provide user-friendly error messages
      let errorMessage = 'Failed to send SMS via Twilio';
      if (error?.message === 'Authenticate' || error?.code === 20003) {
        errorMessage = 'Twilio authentication failed. Please check your TWILIO_AUTH_TOKEN in .env.local. The token may need to be regenerated in Twilio Console.';
      } else if (error?.code === 20429 || error?.code === 20001) {
        errorMessage = `Twilio API error: ${error.message}. Please check your Twilio account status.`;
      } else if (error?.message) {
        errorMessage = `Failed to send SMS via Twilio: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
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
        .from('profiles')
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

      // Try verifying OTP via Supabase Auth first
      const { data: verifyData, error: verifyError } = await serverSupabase.auth.verifyOtp({
        phone: user.phone,
        token: code,
        type: 'sms',
      });

      // If Supabase verification fails, try Twilio Verify API as fallback
      // (in case code was sent via Twilio Verify directly)
      if (verifyError) {
        logger.warn('Supabase OTP verification failed, trying Twilio Verify API', {
          service: 'PhoneVerificationService',
          userId,
          error: verifyError.message,
        });

        // Try Twilio Verify API
        const twilioVerifyResult = await this.verifyCodeViaTwilioVerify(user.phone, code);
        
        if (!twilioVerifyResult.success) {
          // Both methods failed - return user-friendly error
          if (verifyError.message?.includes('expired') || twilioVerifyResult.error?.includes('expired')) {
            return { success: false, error: 'Invalid or expired verification code. Please request a new code.' };
          }
          return { success: false, error: twilioVerifyResult.error || verifyError.message || 'Invalid verification code' };
        }
        
        // Twilio Verify succeeded - continue with marking phone as verified
      }

      // Mark phone as verified in our users table
      const { data: updateData, error: updateError } = await serverSupabase
        .from('profiles')
        .update({
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        logger.error('Failed to mark phone as verified', {
          service: 'PhoneVerificationService',
          userId,
          error: updateError.message,
        });
        return { success: false, error: 'Failed to verify phone number' };
      }

      // Verify the update actually happened
      if (!updateData || updateData.length === 0) {
        logger.error('No rows updated when marking phone as verified', {
          service: 'PhoneVerificationService',
          userId,
        });
        return { success: false, error: 'Failed to verify phone number' };
      }

      logger.info('Phone number verified successfully', {
        service: 'PhoneVerificationService',
        userId,
        phoneNumber: user.phone.substring(0, 4) + '****',
        phoneVerified: updateData[0].phone_verified,
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
        .from('profiles')
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
   * Verify code using Twilio Verify API
   */
  private static async verifyCodeViaTwilioVerify(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN?.replace(/\s+/g, '').replace(/[\r\n\t]/g, '');
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (!accountSid || !authToken || !verifyServiceSid) {
        return { success: false, error: 'Twilio Verify not configured' };
      }

      const client = twilio(accountSid, authToken);

      const verificationCheck = await client.verify.v2.services(verifyServiceSid)
        .verificationChecks
        .create({ to: phoneNumber, code });

      if (verificationCheck.status === 'approved') {
        logger.info('Phone verification code verified via Twilio Verify', {
          service: 'PhoneVerificationService',
          phoneNumber: phoneNumber.substring(0, 4) + '****',
          verificationSid: verificationCheck.sid,
        });
        return { success: true };
      } else {
        logger.warn('Twilio Verify code verification failed', {
          service: 'PhoneVerificationService',
          phoneNumber: phoneNumber.substring(0, 4) + '****',
          status: verificationCheck.status,
        });
        return { success: false, error: 'Invalid or expired verification code' };
      }
    } catch (error: unknown) {
      logger.error('Error verifying code via Twilio Verify', error, {
        service: 'PhoneVerificationService',
      });
      
      if (error?.code === 20404) {
        return { success: false, error: 'Verification code not found. Please request a new code.' };
      }
      
      return { success: false, error: error?.message || 'Failed to verify code' };
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user, error } = await serverSupabase
        .from('profiles')
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

