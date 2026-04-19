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

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const { id: contractId } = await params;
    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID');
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
        await Promise.allSettled([
          NotificationService.createNotification({
            userId: contract.contractor_id,
            type: 'contract_signed',
            title: 'Contract Accepted!',
            message: `All parties have signed the contract for "${contract.title || 'your job'}".`,
            actionUrl: `/contractor/jobs/${contract.job_id}`,
          }),
          NotificationService.createNotification({
            userId: contract.homeowner_id,
            type: 'contract_signed',
            title: 'Contract Accepted!',
            message: `All parties have signed the contract for "${contract.title || 'your job'}".`,
            actionUrl: `/jobs/${contract.job_id}`,
          }),
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      signed_at: nowIso,
      contract_promoted: promoted,
    });
  }
);
