/**
 * POST /api/contracts/[id]/sign-as-cosigner
 *
 * A user who is on the contract_signatories list for a contract signs
 * it. Updates `signed_at`. If that was the last outstanding signature
 * AND both legacy parties (contractor + primary homeowner) have also
 * signed, we promote the contract to ACCEPTED and notify both sides.
 *
 * R3 #4 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Auth: caller must match `contract_signatories.user_id`. Token-based
 * sign (for email invites to non-platform users) is a follow-up and
 * will live at /api/contracts/co-sign/[token].
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger, CONTRACT_STATUS } from '@mintenance/shared';
import { ContractSignatoriesService } from '@/lib/services/contracts/ContractSignatoriesService';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const { id: contractId } = await params;
    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID');
    }

    // Idempotency — closes the race window between the row.signed_at
    // check and the UPDATE that follows. Without this, two concurrent
    // requests could both pass the "already signed" check, both run
    // UPDATE, both pass the all-signed test, both fire the
    // dual-promotion notifications. The "already_signed: true" early
    // return on row.signed_at is a happy-path fast path; this is the
    // belt-and-braces guard. AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'contract_sign_cosigner',
      user.id,
      contractId
    );
    const idem = await checkIdempotency<unknown>(
      idempotencyKey,
      'contract_sign_cosigner'
    );
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info(
        'Duplicate contract_sign_cosigner — returning cached result',
        { service: 'contracts', idempotencyKey, userId: user.id, contractId }
      );
      return NextResponse.json(idem.cachedResult);
    }

    // Find the caller's signatory row for this contract.
    const { data: row, error: rowError } = await serverSupabase
      .from('contract_signatories')
      .select('id, signed_at, role')
      .eq('contract_id', contractId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (rowError) {
      logger.error('Failed to load signatory row', {
        service: 'contracts/sign-as-cosigner',
        contractId,
        userId: user.id,
        error: rowError.message,
      });
      throw new NotFoundError('Signatory record not found');
    }
    if (!row) {
      throw new ForbiddenError(
        'You are not listed as a co-signer on this contract'
      );
    }
    if (row.signed_at) {
      return NextResponse.json({
        success: true,
        already_signed: true,
        signed_at: row.signed_at,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await serverSupabase
      .from('contract_signatories')
      .update({ signed_at: nowIso })
      .eq('id', row.id);

    if (updateError) {
      logger.error('Failed to update signatory', {
        service: 'contracts/sign-as-cosigner',
        contractId,
        error: updateError.message,
      });
      throw new BadRequestError('Failed to record signature');
    }

    // Re-evaluate: if all co-signers + both legacy parties are signed,
    // promote the contract to ACCEPTED.
    const { data: contract } = await serverSupabase
      .from('contracts')
      .select(
        'id, job_id, status, title, contractor_id, homeowner_id, contractor_signed_at, homeowner_signed_at'
      )
      .eq('id', contractId)
      .single();

    let promoted = false;
    if (
      contract &&
      contract.contractor_signed_at &&
      contract.homeowner_signed_at &&
      contract.status !== CONTRACT_STATUS.ACCEPTED &&
      (await ContractSignatoriesService.areAllCosignersSigned(contractId))
    ) {
      const { error: promoteError } = await serverSupabase
        .from('contracts')
        .update({
          status: CONTRACT_STATUS.ACCEPTED,
          updated_at: nowIso,
        })
        .eq('id', contractId);

      if (promoteError) {
        logger.warn('Failed to promote contract to ACCEPTED', {
          service: 'contracts/sign-as-cosigner',
          contractId,
          error: promoteError.message,
        });
      } else {
        promoted = true;
        // Notify both legacy parties.
        // 2026-05-21 Mint Editorial voice — match accept/route.ts so
        // every "fully signed" path produces the same notification.
        const jobLabel = contract.title || 'your job';
        await Promise.allSettled([
          NotificationService.createNotification({
            userId: contract.contractor_id,
            type: 'contract_signed',
            title: `${jobLabel} — contract is live`,
            message: `All sides signed. Homeowner funds escrow next; you'll get a notification when the money lands.`,
            actionUrl: `/contractor/jobs/${contract.job_id}`,
          }),
          NotificationService.createNotification({
            userId: contract.homeowner_id,
            type: 'contract_signed',
            title: `${jobLabel} — contract is live`,
            message: `All sides signed. Next step is to fund the escrow — payment stays held until you approve the finished work.`,
            actionUrl: `/jobs/${contract.job_id}`,
          }),
        ]);
      }
    }

    const responseData = {
      success: true,
      signed_at: nowIso,
      contract_promoted: promoted,
    };

    await storeIdempotencyResult(
      idempotencyKey,
      'contract_sign_cosigner',
      responseData,
      user.id,
      { contractId, signatoryId: row.id }
    );

    return NextResponse.json(responseData);
  }
);
