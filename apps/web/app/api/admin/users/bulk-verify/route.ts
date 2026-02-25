import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';

const bulkVerifySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request, { user: admin }) => {
  const validation = await validateRequest(request, bulkVerifySchema);
  if (validation instanceof (await import('next/server')).NextResponse) return validation;
  const { data } = validation;

  const { userIds, action, reason } = data;

  if (action === 'reject' && !reason) {
    throw new BadRequestError('Reason is required when rejecting verifications');
  }

  const results = {
    successful: [] as string[],
    failed: [] as Array<{ userId: string; error: string }>,
  };

  for (const userId of userIds) {
    try {
      const { data: userData, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, role, admin_verified, company_name, license_number')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        results.failed.push({ userId, error: 'User not found' });
        continue;
      }

      if (userData.role !== 'contractor') {
        results.failed.push({ userId, error: 'Only contractors can be verified' });
        continue;
      }

      const previousStatus = userData.admin_verified || false;
      const newStatus = action === 'approve';

      const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
      const verificationScore = automatedCheck.verificationScore;

      const { error: updateError } = await serverSupabase
        .from('profiles')
        .update({
          admin_verified: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        results.failed.push({ userId, error: updateError.message });
        continue;
      }

      await VerificationService.logVerificationAction(
        userId,
        admin.id,
        action === 'approve' ? 'approved' : 'rejected',
        reason || null,
        verificationScore,
        (() => {
          const checksPassed: Record<string, boolean> = {};
          if (automatedCheck.checks && Array.isArray(automatedCheck.checks)) {
            automatedCheck.checks.forEach((check: { name: string; passed: boolean }) => {
              checksPassed[check.name] = check.passed;
            });
          }
          return checksPassed;
        })(),
        previousStatus,
        newStatus
      );

      await AdminActivityLogger.logFromRequest(
        request,
        admin.id,
        `bulk_verification_${action}`,
        'verification',
        `Bulk ${action === 'approve' ? 'approved' : 'rejected'} contractor verification`,
        'user',
        userId,
        {
          verification_score: verificationScore,
          reason: reason || null,
          bulk_action: true,
        }
      );

      AdminNotificationService.notifyContractorVerification(
        userId,
        action === 'approve' ? 'approved' : 'rejected',
        reason || undefined
      ).catch((error) => {
        logger.error('Failed to send bulk verification notification', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      results.successful.push(userId);
    } catch (error) {
      results.failed.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  await AdminActivityLogger.logFromRequest(
    request,
    admin.id,
    `bulk_verification_${action}_completed`,
    'verification',
    `Bulk verification ${action}: ${results.successful.length} successful, ${results.failed.length} failed`,
    undefined,
    undefined,
    {
      total: userIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      action,
    }
  );

  return NextResponse.json({
    success: true,
    results: {
      total: userIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      details: results,
    },
  });
});
