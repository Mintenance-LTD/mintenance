/**
 * POST /api/contracts/[id]/invite-cosigner
 *
 * Primary homeowner adds a second homeowner to the contract-signing
 * circle. R3 #4 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Behaviour:
 *   - Caller must be the primary homeowner on the contract (RLS also
 *     enforces this, belt-and-braces).
 *   - Contract must not already be ACCEPTED.
 *   - If the provided email matches an existing profile, we attach the
 *     signatory row to that user_id immediately (they can sign via the
 *     normal in-app flow); otherwise we store the email + token and
 *     the email lands in their inbox as an invitation.
 *   - Generates a single-use invitation_token (48 chars hex).
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger, CONTRACT_STATUS } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';

const BodySchema = z.object({
  email: z.string().email().max(256),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const { id: contractId } = await params;
    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID');
    }

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError('email is required');
    }
    const email = parsed.data.email.toLowerCase().trim();

    // Fetch contract, confirm caller is the primary homeowner, refuse
    // if already fully accepted.
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .select('id, job_id, homeowner_id, status, title')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new NotFoundError('Contract not found');
    }
    if (contract.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the primary homeowner can add co-signers');
    }
    if (contract.status === CONTRACT_STATUS.ACCEPTED) {
      throw new BadRequestError('Contract is already fully accepted');
    }

    // Try to match email → existing profile; NULL user_id if not found.
    const { data: existingProfile } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    const resolvedUserId = existingProfile?.id ?? null;

    // Don't allow inviting the primary homeowner themselves.
    if (resolvedUserId === user.id) {
      throw new BadRequestError("You can't invite yourself as a co-signer");
    }

    const invitationToken = randomBytes(24).toString('hex');

    const { data: inserted, error: insertError } = await serverSupabase
      .from('contract_signatories')
      .insert({
        contract_id: contractId,
        user_id: resolvedUserId,
        invited_email: email,
        invitation_token: invitationToken,
        role: 'second_homeowner',
      })
      .select('id, user_id, invited_email, invitation_token')
      .single();

    if (insertError) {
      logger.error('Failed to insert co-signer invite', {
        service: 'contracts/invite-cosigner',
        contractId,
        error: insertError.message,
      });
      throw new BadRequestError(
        insertError.message || 'Failed to invite co-signer'
      );
    }

    // If we matched an existing platform user, notify them in-app.
    // Emails can land later — we keep this route synchronous-light.
    if (resolvedUserId) {
      try {
        // 2026-05-21 Mint Editorial voice — name the contract; the
        // inviter's email is in the metadata, not the headline.
        await NotificationService.createNotification({
          userId: resolvedUserId,
          type: 'contract_cosign_requested',
          title: `You're invited to co-sign ${contract.title || 'a contract'}`,
          message: `Two-minute read, one tap to sign. Your signature doesn't move any money.`,
          actionUrl: `/jobs/${contract.job_id}`,
          metadata: { contractId, jobId: contract.job_id, invitedEmail: email },
        });
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      signatory: inserted,
      requires_email_invite: resolvedUserId === null,
    });
  }
);
