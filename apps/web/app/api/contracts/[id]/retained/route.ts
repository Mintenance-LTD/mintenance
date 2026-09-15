import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

export const GET = withApiHandler({}, async (_request, { user, params }) => {
  if (!isValidUUID(params.id)) throw new BadRequestError('Invalid contract ID');
  const { data, error } = await serverSupabase.rpc('read_retained_contract', {
    p_contract_id: params.id,
    p_user_id: user.id,
  });
  if (error) {
    if (error.code === 'P0002')
      throw new NotFoundError('Retained contract not found');
    if (error.code === '42501')
      throw new ForbiddenError('You cannot access this retained contract');
    throw new InternalServerError(
      'Unable to load retained contract. Please retry.'
    );
  }
  if (!data?.contract || data.contract.id !== params.id)
    throw new InternalServerError('Unable to confirm retained contract');
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
