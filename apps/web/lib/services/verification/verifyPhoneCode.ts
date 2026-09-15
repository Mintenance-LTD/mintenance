import { serverSupabase, createAnonClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function verifyPhoneCode(
  userId: string,
  code: string,
  verifyFallback: (
    phone: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>
): Promise<{ success: boolean; error?: string }> {
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
      return {
        success: false,
        error: 'Phone number not found. Please request a new code.',
      };
    }

    // Try verifying OTP via Supabase Auth first
    const { data: verifyData, error: verifyError } =
      await createAnonClient().auth.verifyOtp({
        phone: user.phone,
        token: code,
        type: 'sms',
      });

    if (!verifyError && verifyData.user?.id !== userId) {
      return {
        success: false,
        error: 'Verification does not match this account',
      };
    }

    // If Supabase verification fails, try Twilio Verify API as fallback
    // (in case code was sent via Twilio Verify directly)
    if (verifyError) {
      logger.warn(
        'Supabase OTP verification failed, trying Twilio Verify API',
        {
          service: 'PhoneVerificationService',
          userId,
          error: verifyError.message,
        }
      );

      // Try Twilio Verify API
      const twilioVerifyResult = await verifyFallback(user.phone, code);

      if (!twilioVerifyResult.success) {
        // Both methods failed - return user-friendly error
        if (
          verifyError.message?.includes('expired') ||
          twilioVerifyResult.error?.includes('expired')
        ) {
          return {
            success: false,
            error:
              'Invalid or expired verification code. Please request a new code.',
          };
        }
        return {
          success: false,
          error:
            twilioVerifyResult.error ||
            verifyError.message ||
            'Invalid verification code',
        };
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
      .eq('phone', user.phone)
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
