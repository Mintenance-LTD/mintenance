import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request body');
    }

    const { action, reason } = validation.data;

    // Verify user exists and is a contractor
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

    // Require reason for rejection
    if (action === 'reject' && !reason) {
      throw new BadRequestError('Reason is required when rejecting verification');
    }

    // Get current verification status
    const previousStatus = userData.admin_verified || false;
    const newStatus = action === 'approve';

    // Run automated checks to get current score
    const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
    const verificationScore = automatedCheck.verificationScore;

    // Update admin_verified status
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

    // Log verification action
    // Convert VerificationCheck[] to ChecksPassed format
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

    // Log admin activity
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

    // Send email notification to contractor
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
  } catch (error) {
    return handleAPIError(error);
  }
}

