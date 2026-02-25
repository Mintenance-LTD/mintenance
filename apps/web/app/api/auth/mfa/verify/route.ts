import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MFAService } from '@/lib/mfa/mfa-service';
import { createTokenPair, createAuthCookieHeaders } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { DatabaseManager } from '@/lib/database';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const verifyMFASchema = z.object({
  preMfaToken: z.string().min(1, 'Pre-MFA token is required'),
  code: z.string().min(6, 'Code must be at least 6 characters'),
  method: z.enum(['totp', 'backup_code', 'sms', 'email']),
  rememberDevice: z.boolean().optional().default(false),
});

export const POST = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  const body = await request.json();
  const validation = verifyMFASchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request', details: validation.error.errors }, { status: 400 });
  }
  const { preMfaToken, code, method, rememberDevice } = validation.data;

  const userId = await MFAService.validatePreMFASession(preMfaToken);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired session. Please login again.' }, { status: 401 });
  }

  const rateLimitResult = await rateLimiter.checkRateLimit({ windowMs: 900000, maxRequests: 5, identifier: `mfa-verify:${userId}` });
  if (!rateLimitResult.allowed) {
    logger.warn('MFA verification rate limit exceeded', { service: 'mfa', userId });
    return NextResponse.json({ error: 'Too many verification attempts. Please try again later.', retryAfter: rateLimitResult.retryAfter }, { status: 429 });
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  const verificationResult = await MFAService.verifyMFA(userId, code, method, ipAddress, userAgent);
  if (!verificationResult.success) {
    return NextResponse.json({ error: verificationResult.error || 'Invalid verification code' }, { status: 401 });
  }

  await MFAService.deletePreMFASession(preMfaToken);

  const user = await DatabaseManager.getUserById(userId);
  if (!user) {
    logger.error('User not found after MFA verification', { service: 'mfa', userId });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { accessToken, refreshToken } = await createTokenPair({ id: user.id, email: user.email, role: user.role }, { userAgent }, ipAddress);

  let trustedDeviceToken: string | undefined;
  if (rememberDevice) {
    const trustedDevice = await MFAService.createTrustedDevice(userId, 'Web Browser', undefined, ipAddress, userAgent);
    trustedDeviceToken = trustedDevice.deviceToken;
  }

  logger.info('MFA verification successful', { service: 'mfa', userId, method, rememberDevice });

  const response = NextResponse.json({
    success: true, message: 'Login successful',
    user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name, emailVerified: user.verified },
    requiresNewBackupCodes: verificationResult.requiresNewBackupCodes,
  });

  const cookieHeaders = createAuthCookieHeaders(accessToken, false, refreshToken);
  cookieHeaders.forEach((value, key) => response.headers.append(key, value));

  if (trustedDeviceToken) {
    const maxAge = 30 * 24 * 60 * 60;
    const isProduction = process.env.NODE_ENV === 'production';
    response.headers.append('Set-Cookie', `mintenance-trusted-device=${trustedDeviceToken}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${isProduction ? '; Secure' : ''}`);
  }

  return response;
});
