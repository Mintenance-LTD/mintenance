import { parseContractConsent } from '@/lib/services/contracts/customer-consent';
import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  NotFoundError,
  InternalServerError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { csrf: false },
  async (req, { user, params }) => {
    const { data: c, error } = await serverSupabase
      .from('contracts')
      .select(
        'id,job_id,homeowner_id,contractor_id,agreement_formed_at,cancellation_information_provided_at,cancellation_deadline,cancellation_requested_at'
      )
      .eq('id', params.id)
      .maybeSingle();
    if (error) throw new InternalServerError('Could not load agreement');
    const { data: job } = c
      ? await serverSupabase
          .from('jobs')
          .select('payer_user_id')
          .eq('id', c.job_id)
          .maybeSingle()
      : { data: null };
    if (
      !c ||
      ![c.homeowner_id, c.contractor_id, job?.payer_user_id].includes(user.id)
    )
      throw new NotFoundError('Contract not found');
    const { data: records, error: readError } = await serverSupabase
      .from('contract_consents')
      .select(
        'signer_id,signer_role,contract_version,contract_snapshot,policy_version,early_start_requested,full_performance_acknowledged,early_start_wording,full_performance_wording,accepted_at'
      )
      .eq('contract_id', c.id)
      .order('accepted_at');
    if (readError)
      throw new InternalServerError('Could not load consent records');
    const versions = [...new Set((records || []).map((r) => r.policy_version))];
    const { data: documents, error: docError } = versions.length
      ? await serverSupabase
          .from('customer_policy_documents')
          .select('version,body,sha256')
          .in('version', versions)
      : { data: [], error: null };
    if (docError)
      throw new InternalServerError('Could not load archived terms');
    if (new URL(req.url).searchParams.get('download') === '1')
      return new NextResponse(
        JSON.stringify({ agreement: c, records, documents }, null, 2),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="Mintenance-agreement-${c.id}.txt"`,
            'Cache-Control': 'private, no-store',
          },
        }
      );
    return NextResponse.json(
      { agreement: c, records, documents },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (req, { user, params }) => {
    const body = await req.json();
    const legal = parseContractConsent(body.legalConsent, false);
    const { data, error } = await serverSupabase.rpc(
      'review_legacy_cancellation',
      { p_contract: params.id, p_customer: user.id, p_legal: legal }
    );
    if (error?.code === '42501')
      throw new ForbiddenError('Customer access required');
    if (error?.code === '23514' || error?.code === '23505')
      throw new BadRequestError(
        'The agreement changed or is not eligible. Refresh and review it again.'
      );
    if (error)
      throw new InternalServerError('Could not retain cancellation choices');
    return NextResponse.json({
      contract: data,
      message: 'Cancellation information and choices recorded.',
    });
  }
);
