import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/contracts/[id]/reject
 * Homeowner requests changes to a contract, sending it back to the contractor.
 */
export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const { id: contractId } = params;

    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID format');
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    // Fetch contract with ownership check
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .select('id, job_id, contractor_id, homeowner_id, status, title')
      .eq('id', contractId)
      .eq('homeowner_id', user.id)
      .single();

    if (contractError || !contract) {
      throw new NotFoundError('Contract not found or access denied');
    }

    // Only allow rejecting contracts pending homeowner signature
    if (contract.status !== 'pending_homeowner') {
      throw new BadRequestError('Contract can only be sent back when it is awaiting your signature');
    }

    // Revert to draft so contractor can edit and resubmit
    const { data: updatedContract, error: updateError } = await serverSupabase
      .from('contracts')
      .update({
        status: 'draft',
        homeowner_signed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select('id, job_id, status, title, updated_at')
      .single();

    if (updateError) {
      logger.error('Failed to reject contract', updateError, {
        service: 'contracts',
        contractId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to request changes');
    }

    // Notify contractor
    try {
      const { data: homeownerData } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const homeownerName = homeownerData?.first_name && homeownerData?.last_name
        ? `${homeownerData.first_name} ${homeownerData.last_name}`
        : 'The homeowner';

      await NotificationService.createNotification({
        userId: contract.contractor_id,
        title: 'Contract Changes Requested',
        message: `${homeownerName} has requested changes to the contract for "${contract.title || 'your job'}"${reason ? `: "${reason}"` : '. Please review and resubmit.'}`,
        type: 'contract_changes_requested',
        actionUrl: `/contractor/jobs/${contract.job_id}`,
      });

      // Also send a message in the thread
      const { data: threadData } = await serverSupabase
        .from('message_threads')
        .select('id')
        .eq('job_id', contract.job_id)
        .single();

      if (threadData) {
        await serverSupabase
          .from('messages')
          .insert({
            job_id: contract.job_id,
            sender_id: user.id,
            receiver_id: contract.contractor_id,
            content: `📋 Contract changes requested${reason ? `:\n\n"${reason}"` : '. Please review and update the contract.'}`,
            message_type: 'system',
            read: false,
          });
      }
    } catch (notificationError) {
      logger.error('Failed to create rejection notification', notificationError, {
        service: 'contracts',
        contractId,
      });
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: 'Contract sent back to contractor for changes.',
    });
  },
);
