import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request, { user: admin, params }) => {
  const { userId } = params as { userId: string };

  const validation = await validateRequest(request, verifySchema);
  if (validation instanceof (await import('next/server')).NextResponse) return validation;
  const { data } = validation;

  const { action, reason } = data;

  const { data: userData, error: userError } = await serverSupabase
    .from('profiles')
    .select('id, role, admin_verified, company_name, license_number')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    throw new NotFoundError('User not found');
  }

  if (userData.role !== 'contractor') {
    throw new BadRequestError('Only contractors can be verified');
  }

  if (action === 'reject' && !reason) {
    throw new BadRequestError('Reason is required when rejecting verification');
  }

  const previousStatus = userData.admin_verified || false;
  const newStatus = action === 'approve';

  const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
  const verificationScore = automatedCheck.verificationScore;

  const { data: updatedUser, error: updateError } = await serverSupabase
    .from('profiles')
    .update({
      admin_verified: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    logger.error('Error updating verification status', { userId, action, error: updateError.message });
    throw new InternalServerError('Failed to update verification status');
  }

  const checksPassed: Record<string, boolean> = {};
  if (automatedCheck.checks && Array.isArray(automatedCheck.checks)) {
    automatedCheck.checks.forEach((check: { name: string; passed: boolean }) => {
      checksPassed[check.name] = check.passed;
    });
  }

  await VerificationService.logVerificationAction(
    userId,
    admin.id,
    action === 'approve' ? 'approved' : 'rejected',
    reason || null,
    verificationScore,
    checksPassed,
    previousStatus,
    newStatus
  );

  await AdminActivityLogger.logFromRequest(
    request,
    admin.id,
    `verification_${action}`,
    'verification',
    `Contractor verification ${action === 'approve' ? 'approved' : 'rejected'}`,
    'user',
    userId,
    {
      verification_score: verificationScore,
      reason: reason || null,
      previous_status: previousStatus,
      new_status: newStatus,
    }
  );

  await AdminNotificationService.notifyContractorVerification(
    userId,
    action === 'approve' ? 'approved' : 'rejected',
    reason || undefined
  ).catch((error) => {
    logger.error('Failed to send verification notification email', {
      userId,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info('Verification action completed', {
    userId,
    adminId: admin.id,
    action,
    previousStatus,
    newStatus,
  });

  return NextResponse.json({
    success: true,
    user: updatedUser,
    verification: {
      status: newStatus ? 'verified' : 'rejected',
      score: verificationScore,
      checks: automatedCheck.checks,
    },
  });
});
