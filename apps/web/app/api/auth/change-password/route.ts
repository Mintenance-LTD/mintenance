import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createAnonClient, serverSupabase } from '@/lib/api/supabaseServer';
import { PasswordValidator, checkPasswordBreach } from '@mintenance/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import {
  BadRequestError,
  UnauthorizedError,
  ServiceUnavailableError,
  ConflictError,
  RateLimitError,
} from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export const maxDuration = 60;
const schema = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z.string().min(8).max(128),
    mfaCode: z.string().min(6).max(16).optional(),
    mfaMethod: z.enum(['totp', 'backup_code']).default('totp'),
  })
  .strict();

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30, windowMs: 900000, criticality: 'auth' } },
  async (request, { user }) => {
    const budget = await rateLimiter.checkRateLimit({
      identifier: `password-change:${user.id}`,
      maxRequests: 5,
      windowMs: 900000,
      criticality: 'auth',
    });
    if (!budget.allowed) throw new RateLimitError();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError('Invalid password change request');
    const { currentPassword, newPassword, mfaCode, mfaMethod } = parsed.data;
    const validation = PasswordValidator.validate(newPassword, {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    });
    if (!validation.isValid)
      throw new BadRequestError(validation.errors.join(', '));
    if (currentPassword === newPassword)
      throw new BadRequestError('Choose a different password');
    const { data: snapshot, error: snapshotError } = await serverSupabase
      .from('profiles')
      .select('tokens_revoked_at')
      .eq('id', user.id)
      .single();
    if (snapshotError || !snapshot)
      throw new ServiceUnavailableError('Account verification');
    const { data: identity, error: identityError } =
      await serverSupabase.auth.admin.getUserById(user.id);
    if (identityError || identity?.user?.id !== user.id || !identity.user.email)
      throw new UnauthorizedError('Account could not be verified');
    const auth = createAnonClient();
    const { data: proof, error: proofError } =
      await auth.auth.signInWithPassword({
        email: identity.user.email,
        password: currentPassword,
      });
    if (proof?.session) {
      const { error } = await auth.auth.signOut({ scope: 'local' });
      if (error) throw new ServiceUnavailableError('Password verification');
    }
    if (proofError || proof?.user?.id !== user.id || !proof?.session)
      throw new UnauthorizedError('Current password is incorrect');
    const status = await MFAService.getMFAStatus(user.id);
    if (status.enabled) {
      if (!mfaCode)
        return NextResponse.json(
          { requiresMfa: true, error: 'Enter an authenticator or backup code' },
          { status: 403 }
        );
      const verification = await MFAService.verifyMFA(
        user.id,
        mfaCode,
        mfaMethod
      );
      if (!verification.success)
        throw new UnauthorizedError('Invalid MFA code');
    }
    const breach = await checkPasswordBreach(newPassword);
    if (breach.isBreached)
      throw new BadRequestError(
        'Choose a password that has not appeared in a data breach'
      );
    const { data: operation, error: beginError } = await serverSupabase.rpc(
      'begin_password_change',
      { p_user_id: user.id, p_expected_revoked_at: snapshot.tokens_revoked_at }
    );
    if (beginError?.code === '55000')
      throw new ConflictError(
        'A previous password change is still being secured. Please try later.'
      );
    if (beginError || !z.string().uuid().safeParse(operation).success)
      throw new ServiceUnavailableError('Password change');
    let confirmed = false;
    try {
      const result = await serverSupabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      confirmed = !result.error && result.data?.user?.id === user.id;
    } catch {
      /* The provider may have committed despite a lost response. Never replay a password automatically. */
    }
    let cleanupConfirmed = false;
    try {
      if (confirmed) {
        const { error } = await serverSupabase.rpc('finish_password_change', {
          p_operation_id: operation,
        });
        cleanupConfirmed = !error;
      }
    } catch {
      /* Durable recovery remains scheduled without storing either password. */
    }
    const completed = confirmed && cleanupConfirmed;
    return NextResponse.json(
      {
        success: completed,
        status: completed ? 'completed' : 'pending',
        requestId: operation,
        message: completed
          ? 'Password changed. Sign in again with your new password.'
          : confirmed
            ? 'Password changed; session cleanup is pending. Sign in again after cleanup completes.'
            : 'Password change could not be confirmed. Try signing in with your new password, or use password reset.',
      },
      {
        status: completed ? 200 : 202,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
);
