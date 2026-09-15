import { serverSupabase, createAnonClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import twilio from 'twilio';
import { verifyPhoneCode } from './verifyPhoneCode';

/**
 * Service for phone number verification via SMS using Supabase Auth
 * Uses Supabase's built-in SMS provider (TextLocal, Twilio, etc.)
 */
export class PhoneVerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 5;

  /**
   * Send SMS verification code to phone number using Supabase Auth SMS
   */
  static async sendVerificationCode(
    userId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      // Check if user exists in auth.users first
      const { data: authUser, error: authUserError } =
        await serverSupabase.auth.admin.getUserById(userId);

      if (authUserError || !authUser?.user) {
        return {
          success: false,
          error: 'Account could not be verified. Please try again.',
        };
      }

      // If user exists but doesn't have phone in auth.users, update it first
      if (authUser?.user && !authUser.user.phone) {
        await serverSupabase.auth.admin.updateUserById(userId, {
          phone: phoneNumber,
        });
      }

      // Use Supabase Auth to send OTP via SMS
      // This uses the configured SMS provider (TextLocal, Twilio, etc.) in Supabase
      const { data, error } = await createAnonClient().auth.signInWithOtp({
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
        if (
          error.message?.includes('SMS provider') ||
          error.message?.includes('not configured') ||
          error.message?.includes('SMS service is not enabled')
        ) {
          // Operator detail (SMS provider not configured in Supabase)
          // is in the logger.error above; users get a plain message.
          return {
            success: false,
            error:
              'Text messaging is temporarily unavailable. Please try again later or contact support.',
          };
        }

        // Check if signups are disabled, user doesn't exist, timeout, or other errors - use Admin API fallback
        if (
          error.message?.includes('Signups not allowed') ||
          error.message?.includes('User not found') ||
          error.status === 400 ||
          error.status === 422 ||
          error.status === 504 ||
          !error.message ||
          error.message === '{}'
        ) {
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
          error: `Failed to send verification code: ${error.message}`,
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
        logger.info(
          'Development mode: Check Supabase logs or Inbucket for OTP code',
          {
            service: 'PhoneVerificationService',
            phoneNumber: phoneNumber.substring(0, 4) + '****',
          }
        );
        return {
          success: true,
          devCode:
            'Check Supabase logs or Inbucket email interface for OTP code',
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
  private static async sendSMSViaAdminAPI(
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceKey) {
        return {
          success: false,
          error: 'Supabase configuration missing',
        };
      }

      // Use Supabase Admin API to send OTP
      const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
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

        // Supabase Admin API failed - always try Twilio Verify as final fallback
        logger.warn(
          'Supabase Admin API failed, trying Twilio Verify as final fallback',
          {
            service: 'PhoneVerificationService',
            phoneNumber: phoneNumber.substring(0, 4) + '****',
            status: response.status,
            error: errorData,
          }
        );

        return await this.sendSMSViaTwilioVerify(phoneNumber);
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
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Fallback: Send SMS via Twilio Verify API directly
   */
  private static async sendSMSViaTwilioVerify(
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; devCode?: string }> {
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
        // Missing Twilio env vars are logged above for the operator.
        return {
          success: false,
          error:
            'Text messaging is temporarily unavailable. Please try again later or contact support.',
        };
      }

      // Sanitize token: remove ALL whitespace including newlines, carriage returns, tabs, etc.
      const sanitizedToken = authToken
        ?.replace(/\s+/g, '')
        .replace(/[\r\n\t]/g, '');
      const originalLength = authToken?.length;
      const sanitizedLength = sanitizedToken?.length;
      const hasWhitespace = authToken && authToken !== sanitizedToken;
      const hasNewlines =
        authToken && (authToken.includes('\n') || authToken.includes('\r'));
      const tokenFormatValid =
        sanitizedToken &&
        sanitizedToken.length === 32 &&
        /^[a-zA-Z0-9]{32}$/.test(sanitizedToken);

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
        // Malformed TWILIO_AUTH_TOKEN details are logged above.
        return {
          success: false,
          error:
            'Text messaging is temporarily unavailable. Please try again later or contact support.',
        };
      }
      const client = twilio(accountSid, cleanAuthToken);

      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });

      logger.info('SMS OTP sent via Twilio Verify', {
        service: 'PhoneVerificationService',
        phoneNumber: phoneNumber.substring(0, 4) + '****',
        verificationSid: verification.sid,
      });

      return { success: true };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      logger.error('Error sending SMS via Twilio Verify', error, {
        service: 'PhoneVerificationService',
        errorCode: err?.code,
        errorStatus: err?.status,
        errorMessage: err?.message,
      });

      // 2026-07-26: these messages reach end users (the mobile
      // verification modal renders them verbatim), so keep them
      // user-facing — the operator detail (invalid TWILIO_AUTH_TOKEN,
      // account status, raw Twilio error) is already in logger.error
      // above for Sentry/ops.
      let errorMessage =
        'We could not send the text message right now. Please try again later.';
      if (err?.message === 'Authenticate' || err?.code === 20003) {
        errorMessage =
          'Text messaging is temporarily unavailable. Please try again later or contact support.';
      } else if (err?.code === 20429 || err?.code === 20001) {
        errorMessage =
          'Too many attempts right now. Please wait a minute and try again.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify phone number with code using Supabase Auth
   */
  static async verifyCode(
    userId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    return verifyPhoneCode(userId, code, (phone, value) =>
      this.verifyCodeViaTwilioVerify(phone, value)
    );
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
  private static async verifyCodeViaTwilioVerify(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN?.replace(
        /\s+/g,
        ''
      ).replace(/[\r\n\t]/g, '');
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (!accountSid || !authToken || !verifyServiceSid) {
        return { success: false, error: 'Twilio Verify not configured' };
      }

      const client = twilio(accountSid, authToken);

      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phoneNumber, code });

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
        return {
          success: false,
          error: 'Invalid or expired verification code',
        };
      }
    } catch (error: unknown) {
      logger.error('Error verifying code via Twilio Verify', error, {
        service: 'PhoneVerificationService',
      });

      const err = error as Record<string, unknown>;
      if (err?.code === 20404) {
        return {
          success: false,
          error: 'Verification code not found. Please request a new code.',
        };
      }

      return {
        success: false,
        error: (err?.message as string) || 'Failed to verify code',
      };
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
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
