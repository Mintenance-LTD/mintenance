import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PhoneVerificationService } from '@/lib/services/verification/PhoneVerificationService';
import { requireCSRF } from '@/lib/csrf';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

// Type for verification response
interface VerificationResponse {
  message: string;
  expiresIn?: number;
  devCode?: string;
}

const sendCodeSchema = z.object({
  action: z.literal('send'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (val) => {
        // Remove any spaces, dashes, or parentheses for validation
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        // Must start with + and have 5-15 digits total (country code + number)
        // Format: +[country code][number] where country code is 1-3 digits starting with 1-9
        return /^\+[1-9]\d{4,14}$/.test(cleaned);
      },
      {
        message: 'Phone number must be in international format (e.g., +44 7984 596545 or +1 555 123 4567)',
      }
    )
    .transform((val) => {
      // Normalize the phone number by removing spaces, dashes, and parentheses
      return val.replace(/[\s\-\(\)]/g, '');
    }),
});

const verifyCodeSchema = z.object({
  action: z.literal('verify'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

const resendCodeSchema = z.object({
  action: z.literal('resend'),
});

export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read body once
    const body = await request.json();
    
    // Handle send code action
    if (body.action === 'send') {
      const result = sendCodeSchema.safeParse(body);
      
      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return NextResponse.json(
          {
            error: 'Validation failed',
            errors,
          },
          { status: 400 }
        );
      }

      const { phoneNumber } = result.data;

      // Update user's phone number if different
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      await serverSupabase
        .from('users')
        .update({ phone: phoneNumber })
        .eq('id', user.id);

      const verificationResult = await PhoneVerificationService.sendVerificationCode(user.id, phoneNumber);

      if (!verificationResult.success) {
        return NextResponse.json({ error: verificationResult.error }, { status: 400 });
      }

      // In development mode, return the code so it can be displayed to the user
      const response: VerificationResponse = { 
        message: 'Verification code sent successfully',
        expiresIn: 5, // minutes
      };

      if (verificationResult.devCode) {
        response.devCode = verificationResult.devCode;
        response.message = 'Verification code generated (dev mode - check server console). Code: ' + verificationResult.devCode;
      }

      return NextResponse.json(response);
    }

    // Handle verify code action
    if (body.action === 'verify') {
      const result = verifyCodeSchema.safeParse(body);
      
      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return NextResponse.json(
          {
            error: 'Validation failed',
            errors,
          },
          { status: 400 }
        );
      }

      const { code } = result.data;

      const verificationResult = await PhoneVerificationService.verifyCode(user.id, code);

      if (!verificationResult.success) {
        return NextResponse.json({ error: verificationResult.error }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Phone number verified successfully',
        verified: true,
      });
    }

    // Handle resend code action
    if (body.action === 'resend') {
      const result = resendCodeSchema.safeParse(body);
      
      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return NextResponse.json(
          {
            error: 'Validation failed',
            errors,
          },
          { status: 400 }
        );
      }

      const verificationResult = await PhoneVerificationService.resendCode(user.id);

      if (!verificationResult.success) {
        return NextResponse.json({ error: verificationResult.error }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Verification code resent successfully',
        expiresIn: 5, // minutes
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Phone verification error', error, { service: 'auth' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

