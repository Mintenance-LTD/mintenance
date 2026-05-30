import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// with the rejection-reason rule encoded as a refinement so the
// "reason required when rejecting" check is part of the schema rather
// than a separate branch.
const verificationActionSchema = z
  .object({
    status: z.enum(['verified', 'rejected']),
    reason: z.string().max(1000).optional(),
  })
  .strict()
  .refine((d) => d.status !== 'rejected' || !!d.reason?.trim(), {
    path: ['reason'],
    message: 'A reason is required when rejecting a contractor',
  });

/**
 * PUT /api/admin/verifications/[id]
 * Update a contractor's verification status (approve or reject).
 * Creates a notification for the contractor about the result.
 */
export const PUT = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // Same trust-grant primitive as verifications/credentials PATCH
    // — flipping a contractor's verified status on a stolen session
    // could grant fraudulent accounts platform trust.
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user, params }) => {
    const contractorId = params.id;

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const parsed = verificationActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }
    const { status, reason } = parsed.data;

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
    // 2026-05-25 audit-44 P1: previously only wrote admin_verified +
    // background_check_status. Mobile reads profiles.verification_status
    // (useContractorVerification + the "License Verified" pill on
    // VerificationStatusScreen) — without writing it the contractor
    // sees "Pending" forever even after the admin approves. Live CHECK
    // allows 'none' | 'pending' | 'verified' | 'rejected' (verified via
    // pg_constraint 2026-05-25).
    const updateData: Record<string, unknown> = {
      admin_verified: isVerified,
      background_check_status: status,
      verification_status: isVerified ? 'verified' : 'rejected',
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

    // 2026-05-25 audit-44 P1: cascade the account-level decision onto
    // any still-pending credential_verifications rows. Without this the
    // mobile VerificationStatusScreen (which renders per-register slots
    // straight off credential_verifications) keeps showing 'pending'
    // even when the admin has approved the whole account. We only touch
    // 'pending' rows — never override a row an admin has explicitly
    // verified or rejected through /api/admin/verifications/credentials,
    // and never auto-expire 'expired' rows. Status CHECK allows
    // pending/verified/rejected/expired (verified live 2026-05-25).
    const credentialUpdate: Record<string, unknown> = {
      status: isVerified ? 'verified' : 'rejected',
      verified_by: user.id,
      updated_at: new Date().toISOString(),
    };
    if (isVerified) credentialUpdate.verified_at = new Date().toISOString();
    if (!isVerified)
      credentialUpdate.rejected_reason =
        reason ?? 'Account verification denied';

    const { error: credErr } = await serverSupabase
      .from('credential_verifications')
      .update(credentialUpdate)
      .eq('user_id', contractorId)
      .eq('status', 'pending');
    if (credErr) {
      // Non-blocking — the profile flag is the primary source of trust.
      logger.warn('Failed to cascade credential_verifications', {
        service: 'admin-verifications',
        contractorId,
        error: credErr.message,
      });
    }

    // 2026-05-25 audit-44 P1: same cascade for uploaded evidence rows
    // that ship with review_status='pending' (set by
    // /api/contractor/documents POST when verification_type is included).
    // Without this they accumulate forever and the admin has no per-doc
    // queue. The new /api/admin/verifications/documents endpoint exposes
    // individual approval; the cascade here covers the "approve the
    // whole account" workflow.
    const docUpdate: Record<string, unknown> = {
      review_status: isVerified ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const { error: docErr } = await serverSupabase
      .from('contractor_documents')
      .update(docUpdate)
      .eq('contractor_id', contractorId)
      .eq('review_status', 'pending');
    if (docErr) {
      logger.warn('Failed to cascade contractor_documents review_status', {
        service: 'admin-verifications',
        contractorId,
        error: docErr.message,
      });
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

    // Route through NotificationService — the prior direct insert used
    // a `data` column that doesn't exist on notifications, which meant
    // PostgREST rejected the whole INSERT. Verification outcomes (both
    // approved and rejected) were silently never reaching contractors.
    try {
      await NotificationService.createNotification({
        userId: contractorId,
        type: isVerified ? 'verification_approved' : 'verification_rejected',
        title: isVerified
          ? 'Your account has been verified!'
          : 'Verification update',
        message: isVerified
          ? 'Congratulations! Your contractor account has been verified. You can now accept jobs on the platform.'
          : `Your contractor verification was not approved. Reason: ${reason}. Please update your profile and documentation, then request a new review.`,
        actionUrl: '/contractor/profile',
        metadata: {
          status,
          reason: reason ?? null,
        },
      });
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
