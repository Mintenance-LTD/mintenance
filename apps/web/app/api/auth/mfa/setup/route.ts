import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { MFAService } from '@/lib/mfa/mfa-service';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { rateLimiter } from '@/lib/rate-limiter';
import { logAuditEvent, getClientIp } from '@/lib/audit';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enroll'), preMfaToken: z.string().min(16).max(256) }).strict(),
  z.object({ action: z.literal('verify'), preMfaToken: z.string().min(16).max(256), code: z.string().regex(/^\d{6}$/) }).strict(),
]);
// Password proof is a short-lived pre-MFA token. No app session is issued here.
export const POST = withApiHandler({ auth: false, rateLimit: { maxRequests: 10, windowMs: 900000 } }, async request => {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid setup request' }, { status: 400 });
  const body = parsed.data;
  const userId = await MFAService.validatePreMFASession(body.preMfaToken);
  if (!userId) return NextResponse.json({ error: 'Setup expired. Sign in again.' }, { status: 401 });
  const { data: profile, error } = await serverSupabase.from('profiles').select('role, mfa_enabled').eq('id', userId).single();
  if (error || profile?.role !== 'admin' || profile.mfa_enabled) {
    return NextResponse.json({ error: 'Setup is not available. Sign in again.' }, { status: 403 });
  }
  const limit = await rateLimiter.checkRateLimit({ identifier: `admin-mfa-setup:${body.action}:${userId}`, windowMs: 900000, maxRequests: body.action === 'enroll' ? 3 : 5 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please try later.' }, { status: 429 });
  if (body.action === 'enroll') {
    const enrollment = await MFAService.enrollTOTP(userId);
    await logAuditEvent({ actorId: userId, category: 'mfa', action: 'enroll_totp_started', targetId: userId, ipAddress: getClientIp(request) });
    return NextResponse.json({ qrCode: enrollment.qrCodeDataUrl, secret: enrollment.secret, backupCodes: enrollment.backupCodes }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const result = await MFAService.verifyTOTPEnrollment(userId, body.code);
  if (!result.success) return NextResponse.json({ error: result.error || 'Invalid code' }, { status: 400 });
  await MFAService.deletePreMFASession(body.preMfaToken);
  await logAuditEvent({ actorId: userId, category: 'mfa', action: 'enroll_totp_completed', targetId: userId, ipAddress: getClientIp(request) });
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
});
