import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * DELETE /api/contracts/[id]/delete
 * Contractor can delete a contract before the homeowner has signed it.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const { id: contractId } = params;

    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID format');
    }

    const { data: contract, error: fetchError } = await serverSupabase
      .from('contracts')
      .select('id, job_id, contractor_id, homeowner_id, status, homeowner_signed_at')
      .eq('id', contractId)
      .eq('contractor_id', user.id)
      .single();

    if (fetchError || !contract) {
      throw new NotFoundError('Contract not found or access denied');
    }

    // Cannot delete if homeowner has already signed
    if (contract.homeowner_signed_at) {
      throw new BadRequestError('Cannot delete a contract after the homeowner has signed it');
    }

    // Only allow deleting draft or pending contracts
    if (!['draft', 'pending_homeowner', 'pending_contractor'].includes(contract.status)) {
      throw new BadRequestError('Cannot delete a contract in its current status');
    }

    const { error: deleteError } = await serverSupabase
      .from('contracts')
      .delete()
      .eq('id', contractId)
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete contract', deleteError, {
        service: 'contracts',
        contractId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to delete contract');
    }

    logger.info('Contract deleted by contractor', {
      service: 'contracts',
      contractId,
      jobId: contract.job_id,
      userId: user.id,
    });

    return NextResponse.json({ success: true, message: 'Contract deleted successfully' });
  },
);
