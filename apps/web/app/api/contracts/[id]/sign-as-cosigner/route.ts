import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const { id: contractId } = params;
    if (!isValidUUID(contractId))
      throw new BadRequestError('Invalid contract ID');
    // The parent-row lock serializes this operation with every signing path.
    // Replays recheck membership instead of returning an authorization-stale cache.
    const { data, error } = await serverSupabase.rpc(
      'sign_contract_cosigner_atomic',
      {
        p_contract_id: contractId,
        p_signer_id: user.id,
      }
    );
    if (error) {
      if (error.code === 'P0002') throw new NotFoundError('Contract not found');
      if (error.code === '42501')
        throw new ForbiddenError(
          'You cannot perform this action on this contract'
        );
      if (error.code === '23514')
        throw new BadRequestError('Contract no longer awaits signatures');
      logger.error('Atomic contract operation failed', {
        service: 'contracts/sign-as-cosigner',
        contractId,
        code: error.code,
      });
      throw new InternalServerError('Unable to update contract. Please retry.');
    }
    if (!data || data.success !== true)
      throw new InternalServerError('Unable to confirm contract update');
    return NextResponse.json(data);
  }
);
