import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PhoneVerificationService } from '@/lib/services/verification/PhoneVerificationService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const sendCodeSchema = z.object({
  action: z.literal('send'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
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

    const body = await request.json();
    
    // Handle send code action
    if (body.action === 'send') {
      const validation = await validateRequest(request, sendCodeSchema);
      if ('headers' in validation) {
        return validation;
      }

      const { phoneNumber } = validation.data;

      // Update user's phone number if different
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      await serverSupabase
        .from('users')
        .update({ phone: phoneNumber })
        .eq('id', user.id);

      const result = await PhoneVerificationService.sendVerificationCode(user.id, phoneNumber);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Verification code sent successfully',
        expiresIn: 5, // minutes
      });
    }

    // Handle verify code action
    if (body.action === 'verify') {
      const validation = await validateRequest(request, verifyCodeSchema);
      if ('headers' in validation) {
        return validation;
      }

      const { code } = validation.data;

      const result = await PhoneVerificationService.verifyCode(user.id, code);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Phone number verified successfully',
        verified: true,
      });
    }

    // Handle resend code action
    if (body.action === 'resend') {
      const validation = await validateRequest(request, resendCodeSchema);
      if ('headers' in validation) {
        return validation;
      }

      const result = await PhoneVerificationService.resendCode(user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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

