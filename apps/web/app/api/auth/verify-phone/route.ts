import { NextResponse } from 'next/server';
import { PhoneVerificationService } from '@/lib/services/verification/PhoneVerificationService';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        return /^\+[1-9]\d{4,14}$/.test(cleaned);
      },
      {
        message: 'Phone number must be in international format (e.g., +44 7984 596545 or +1 555 123 4567)',
      }
    )
    .transform((val) => val.replace(/[\s\-\(\)]/g, '')),
});

const verifyCodeSchema = z.object({
  action: z.literal('verify'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

const resendCodeSchema = z.object({
  action: z.literal('resend'),
});

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (request, { user }) => {
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
          { error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      const { phoneNumber } = result.data;

      // Update user's phone number if different
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      await serverSupabase
        .from('profiles')
        .update({ phone: phoneNumber })
        .eq('id', user.id);

      const verificationResult = await PhoneVerificationService.sendVerificationCode(user.id, phoneNumber);

      if (!verificationResult.success) {
        throw new BadRequestError(verificationResult.error || 'Failed to send verification code');
      }

      const response: VerificationResponse = {
        message: 'Verification code sent successfully',
        expiresIn: 5,
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
          { error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      const { code } = result.data;
      const verificationResult = await PhoneVerificationService.verifyCode(user.id, code);

      if (!verificationResult.success) {
        throw new BadRequestError(verificationResult.error || 'Verification failed');
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
          { error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      const verificationResult = await PhoneVerificationService.resendCode(user.id);

      if (!verificationResult.success) {
        throw new BadRequestError(verificationResult.error || 'Failed to resend code');
      }

      return NextResponse.json({
        message: 'Verification code resent successfully',
        expiresIn: 5,
      });
    }

    throw new BadRequestError('Invalid action');
  }
);
