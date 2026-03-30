import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * PUT /api/admin/verifications/[id]
 * Update a contractor's verification status (approve or reject).
 * Creates a notification for the contractor about the result.
 */
export const PUT = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const contractorId = params.id;

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    let body: { status: string; reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { status, reason } = body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "verified" or "rejected"' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !reason?.trim()) {
      return NextResponse.json(
        { error: 'A reason is required when rejecting a contractor' },
        { status: 400 }
      );
    }

    // Verify the contractor exists and is a contractor
    const { data: contractor, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (fetchError || !contractor) {
      logger.error('Contractor not found for verification update', {
        service: 'admin-verifications',
        contractorId,
        error: fetchError?.message,
      });
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Update the contractor's profile
    const isVerified = status === 'verified';
    const updateData: Record<string, unknown> = {
      admin_verified: isVerified,
      background_check_status: status,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update(updateData)
      .eq('id', contractorId);

    if (updateError) {
      logger.error('Failed to update contractor verification', {
        service: 'admin-verifications',
        contractorId,
        status,
        error: updateError.message,
      });
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500 }
      );
    }

    // Log the admin action in the admin_activity_log table
    try {
      await serverSupabase.from('admin_activity_log').insert({
        admin_id: user.id,
        action_type: isVerified ? 'contractor_verified' : 'contractor_rejected',
        action_category: 'verification',
        target_type: 'user',
        target_id: contractorId,
        description: isVerified
          ? `Verified contractor ${contractor.first_name ?? ''} ${contractor.last_name ?? ''} (${contractor.email})`
          : `Rejected contractor ${contractor.first_name ?? ''} ${contractor.last_name ?? ''} (${contractor.email}): ${reason}`,
        metadata: {
          status,
          reason: reason ?? null,
          contractor_email: contractor.email,
        },
      });
    } catch (logError) {
      // Non-blocking: don't fail the request if logging fails
      logger.error('Failed to log admin verification action', {
        service: 'admin-verifications',
        error: logError instanceof Error ? logError.message : String(logError),
      });
    }

    // Create notification for the contractor
    try {
      const notificationData = {
        user_id: contractorId,
        type: isVerified ? 'verification_approved' : 'verification_rejected',
        title: isVerified
          ? 'Your account has been verified!'
          : 'Verification update',
        message: isVerified
          ? 'Congratulations! Your contractor account has been verified. You can now accept jobs on the platform.'
          : `Your contractor verification was not approved. Reason: ${reason}. Please update your profile and documentation, then request a new review.`,
        data: {
          status,
          reason: reason ?? null,
        },
        created_at: new Date().toISOString(),
      };

      await serverSupabase.from('notifications').insert(notificationData);
    } catch (notifError) {
      // Non-blocking: don't fail the request if notification creation fails
      logger.error('Failed to create verification notification', {
        service: 'admin-verifications',
        contractorId,
        error:
          notifError instanceof Error ? notifError.message : String(notifError),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Contractor ${isVerified ? 'verified' : 'rejected'} successfully`,
      data: {
        id: contractorId,
        admin_verified: isVerified,
        background_check_status: status,
      },
    });
  }
);
