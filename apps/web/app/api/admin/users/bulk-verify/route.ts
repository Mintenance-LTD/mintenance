import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const bulkVerifySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const admin = auth.user;

    const body = await request.json();
    const validation = bulkVerifySchema.safeParse(body);

    if (!validation.success) {
      throw new BadRequestError('Invalid request body');
    }

    const { userIds, action, reason } = validation.data;

    // Require reason for bulk rejection
    if (action === 'reject' && !reason) {
      throw new BadRequestError('Reason is required when rejecting verifications');
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

        // Run automated checks
        const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
        const verificationScore = automatedCheck.verificationScore;

        // Update verification status
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

        // Log verification action
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
    return handleAPIError(error);
  }
}

