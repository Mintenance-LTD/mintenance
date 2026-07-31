/**
 * Release-condition gate for the non-admin escrow release path.
 *
 * Extracted from _helpers.ts (2026-07-20) to keep each file under the 300/500
 * line limits. This is the single security-critical gate that decides whether a
 * homeowner (or the auto-release cron, via the same call) may release escrow.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { ForbiddenError } from '@/lib/errors/api-error';

/**
 * Runs all release-condition checks for the non-admin path.
 *
 * Returns:
 * - `{ blocked: NextResponse }` if a condition prevents release
 * - `{ blocked: null, updatedFields }` when all checks pass; `updatedFields`
 *   carries any fields mutated during auto-approval so the caller can update
 *   its local escrow object before proceeding.
 */
export async function checkReleaseConditions(
  escrowTransactionId: string,
  escrowTransaction: {
    admin_hold_status: string | null;
    homeowner_approval: boolean | null;
    photo_verification_status: string | null;
    photo_quality_passed: boolean | null;
    geolocation_verified: boolean | null;
    timestamp_verified: boolean | null;
    cooling_off_ends_at: string | null;
  },
  jobId: string,
  /**
   * Present only when the owning homeowner explicitly asked to approve the
   * work and release in one action, waiving the 48-hour cooling-off window.
   * The release route sets this from the request body AFTER verifying that
   * the caller is the homeowner on this job. Admin and cron callers never
   * pass it, so the default 48-hour window is unaffected for them.
   */
  approvalWaiver?: { actorId: string } | null
): Promise<
  | { blocked: NextResponse; updatedFields?: never }
  | {
      blocked: null;
      updatedFields: {
        homeowner_approval?: boolean;
        cooling_off_ends_at?: string | null;
      };
    }
> {
  // 1. Admin hold
  if (
    escrowTransaction.admin_hold_status === 'admin_hold' ||
    escrowTransaction.admin_hold_status === 'pending_review'
  ) {
    await EscrowStatusService.getBlockingReasons(escrowTransactionId);
    throw new ForbiddenError('Escrow is on admin hold');
  }

  // 2. Active disputes.
  //
  // 2026-07-20: hoisted above the approval gate. Gate 3 can WRITE
  // homeowner_approval as a side effect (auto-approval, and now the explicit
  // waiver path). Approving an escrow whose job is under dispute and only
  // then refusing the release would leave the row permanently approved with
  // no way back. The auto-approval path already screened disputes itself in
  // checkAutoApprovalEligibility, so this is a no-op for that path and a real
  // guard for the waiver path.
  const { count: disputeCount } = await serverSupabase
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .in('status', ['open', 'pending']);
  if ((disputeCount || 0) > 0) {
    return {
      blocked: NextResponse.json(
        { error: 'Active dispute exists - cannot release escrow' },
        { status: 403 }
      ),
    };
  }

  // 3. Homeowner approval, auto-approval, or explicit approve-and-release.
  // Capture whether approval is an explicit human action BEFORE the
  // auto-approval branch can flip the flag (see evaluate.ts gate 2/3 for
  // the rationale). Explicit homeowner approval supersedes the automated
  // photo gate below.
  let explicitHomeownerApproval = !!escrowTransaction.homeowner_approval;
  const updatedFields: {
    homeowner_approval?: boolean;
    cooling_off_ends_at?: string | null;
  } = {};
  if (!escrowTransaction.homeowner_approval) {
    const autoApprovalEligible =
      await HomeownerApprovalService.checkAutoApprovalEligibility(
        escrowTransactionId
      );
    if (!autoApprovalEligible) {
      // 3a. Explicit approve-and-release. The homeowner has confirmed in the
      // UI that this both approves the work and waives the 48-hour window.
      // approveCompletion still enforces the LFC-P0-1 after-photo gate (we
      // deliberately do NOT pass `internal: true`) and still re-verifies that
      // actorId owns this escrow, so this is a UX shortcut, not a privilege
      // escalation.
      if (approvalWaiver) {
        try {
          await HomeownerApprovalService.approveCompletion(
            escrowTransactionId,
            approvalWaiver.actorId,
            'approve_and_release: homeowner approved the work and waived the 48-hour cooling-off window from the payments page',
            { waiveCoolingOff: true }
          );
        } catch (approvalError) {
          logger.warn('Approve-and-release blocked during approval step', {
            service: 'payments',
            escrowTransactionId,
            actorId: approvalWaiver.actorId,
            error:
              approvalError instanceof Error
                ? approvalError.message
                : String(approvalError),
          });
          return {
            blocked: NextResponse.json(
              {
                error:
                  approvalError instanceof Error
                    ? approvalError.message
                    : 'Could not approve completion',
              },
              { status: 403 }
            ),
          };
        }
        // The row is now approved with no cooling-off stamp. Treat it as an
        // explicit human approval so gate 4's photo checks are correctly
        // bypassed — same reasoning as a pre-existing homeowner_approval.
        explicitHomeownerApproval = true;
        updatedFields.homeowner_approval = true;
        updatedFields.cooling_off_ends_at = null;
      } else {
        const blockingReasons =
          await EscrowStatusService.getBlockingReasons(escrowTransactionId);
        return {
          blocked: NextResponse.json(
            { error: 'Waiting for homeowner approval', blockingReasons },
            { status: 403 }
          ),
        };
      }
    } else {
      await HomeownerApprovalService.processAutoApproval(escrowTransactionId);
      const { data: freshEscrow } = await serverSupabase
        .from('escrow_transactions')
        .select('homeowner_approval, cooling_off_ends_at')
        .eq('id', escrowTransactionId)
        .single();
      if (!freshEscrow?.homeowner_approval) {
        return {
          blocked: NextResponse.json(
            { error: 'Auto-approval failed' },
            { status: 403 }
          ),
        };
      }
      updatedFields.homeowner_approval = freshEscrow.homeowner_approval;
      updatedFields.cooling_off_ends_at = freshEscrow.cooling_off_ends_at;
    }
  }

  // 4. Photo verification — only enforced on the auto-approval (7-day) path.
  // These columns are populated by the automated verification pipeline, not
  // by the homeowner approval flow. When a homeowner has explicitly approved
  // the work, their human review supersedes the automated photo checks;
  // enforcing the gate here would deadlock the release (the columns stay null
  // on the approval path). See evaluate.ts gate 3 for the matching rationale.
  if (!explicitHomeownerApproval) {
    if (escrowTransaction.photo_verification_status !== 'verified') {
      const blockingReasons =
        await EscrowStatusService.getBlockingReasons(escrowTransactionId);
      return {
        blocked: NextResponse.json(
          { error: 'Photo verification not completed', blockingReasons },
          { status: 403 }
        ),
      };
    }
    if (!escrowTransaction.photo_quality_passed) {
      return {
        blocked: NextResponse.json(
          { error: 'Photo quality check failed' },
          { status: 403 }
        ),
      };
    }
    if (!escrowTransaction.geolocation_verified) {
      return {
        blocked: NextResponse.json(
          { error: 'Geolocation verification pending' },
          { status: 403 }
        ),
      };
    }
    if (!escrowTransaction.timestamp_verified) {
      return {
        blocked: NextResponse.json(
          { error: 'Timestamp verification pending' },
          { status: 403 }
        ),
      };
    }
  }

  // 5. Cooling-off period
  const coolingOffAt =
    updatedFields.cooling_off_ends_at ?? escrowTransaction.cooling_off_ends_at;
  if (coolingOffAt) {
    const coolingOffEnds = new Date(coolingOffAt);
    if (coolingOffEnds > new Date()) {
      return {
        blocked: NextResponse.json(
          {
            error: `Cooling-off period active until ${coolingOffEnds.toISOString()}`,
            coolingOffEndsAt: coolingOffEnds.toISOString(),
          },
          { status: 403 }
        ),
      };
    }
  }

  // (Active disputes are checked as gate 2, above — hoisted so that the
  // approval gate can never approve a disputed escrow as a side effect.)

  return { blocked: null, updatedFields };
}
