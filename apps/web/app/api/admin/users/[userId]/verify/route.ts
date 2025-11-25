import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { requireCSRF } from '@/lib/csrf';

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const admin = await getCurrentUserFromCookies();

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.issues }, { status: 400 });
    }

    const { action, reason } = validation.data;

    // Verify user exists and is a contractor
    const { data: userData, error: userError } = await serverSupabase
      .from('users')
      .select('id, role, admin_verified, company_name, license_number')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can be verified' }, { status: 400 });
    }

    // Require reason for rejection
    if (action === 'reject' && !reason) {
      return NextResponse.json({ error: 'Reason is required when rejecting verification' }, { status: 400 });
    }

    // Get current verification status
    const previousStatus = userData.admin_verified || false;
    const newStatus = action === 'approve';

    // Run automated checks to get current score
    const automatedCheck = await VerificationService.automatedVerificationCheck(userId);
    const verificationScore = automatedCheck.verificationScore;

    // Update admin_verified status
    const { data: updatedUser, error: updateError } = await serverSupabase
      .from('users')
      .update({
        admin_verified: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating verification status', { userId, action, error: updateError.message });
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
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
    logger.error('Unexpected error in POST /api/admin/users/[userId]/verify', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

