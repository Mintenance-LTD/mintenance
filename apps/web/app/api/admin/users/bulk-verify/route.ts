import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';

const bulkVerifySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUserFromCookies();

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = bulkVerifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: validation.error.issues 
      }, { status: 400 });
    }

    const { userIds, action, reason } = validation.data;

    // Require reason for bulk rejection
    if (action === 'reject' && !reason) {
      return NextResponse.json({ 
        error: 'Reason is required when rejecting verifications' 
      }, { status: 400 });
    }

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
    };

    // Process each user
    for (const userId of userIds) {
      try {
        // Verify user exists and is a contractor
        const { data: userData, error: userError } = await serverSupabase
          .from('users')
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

        // Run automated checks
        const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
        const verificationScore = automatedCheck.verificationScore;

        // Update verification status
        const { error: updateError } = await serverSupabase
          .from('users')
          .update({
            admin_verified: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          results.failed.push({ userId, error: updateError.message });
          continue;
        }

        // Log verification action
        await VerificationService.logVerificationAction(
          userId,
          admin.id,
          action === 'approve' ? 'approved' : 'rejected',
          reason || null,
          verificationScore,
          automatedCheck.checks,
          previousStatus,
          newStatus
        );

        // Log admin activity
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

        // Send email notification (non-blocking)
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

    // Log bulk action summary
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
  } catch (error) {
    logger.error('Unexpected error in bulk verification', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

