import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { contractConsentSchema } from '@/lib/services/contracts/customer-consent';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const validation = await validateRequest(
      request,
      z.object({ legalConsent: contractConsentSchema }).strict()
    );
    if (validation instanceof NextResponse) return validation;
    const legal = validation.data.legalConsent;
    if (!legal.earlyStartRequested)
      throw new BadRequestError(
        'Explicitly request an early start before continuing'
      );
    const { data, error } = await serverSupabase.rpc(
      'request_contract_early_start',
      {
        p_contract: params.id,
        p_customer: user.id,
        p_legal: legal,
      }
    );
    if (error?.code === '42501')
      throw new ForbiddenError('Customer access required');
    if (error?.code === '23514')
      throw new BadRequestError(
        'The agreement changed or is not eligible. Reload and review it again.'
      );
    if (error)
      throw new InternalServerError('Could not record the early-start request');
    return NextResponse.json({ request: data });
  }
);
