import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDraftQuotePricing } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

const schema = z
  .object({
    request_id: z.string().uuid(),
    expected_updated_at: z.string().datetime({ offset: true }).nullable(),
    reason: z.string().trim().min(1).max(2000),
    pricing: z
      .object({
        line_items: z
          .array(
            z
              .object({
                description: z.string().trim().min(1).max(500),
                quantity: z.number(),
                unitPrice: z.number(),
              })
              .strict()
          )
          .min(1)
          .max(100),
        tax_rate_percent: z.number(),
      })
      .strict(),
  })
  .strict();

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    const before = new URL(request.url).searchParams.get('before');
    if (
      before !== null &&
      (!/^\d+$/.test(before) ||
        !Number.isSafeInteger(Number(before)) ||
        Number(before) < 1)
    ) {
      throw new BadRequestError('Invalid history cursor');
    }
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('id')
      .eq('id', params.id)
      .eq('contractor_id', user.id)
      .maybeSingle();
    if (quoteError) throw new InternalServerError('Could not load quote');
    if (!quote) throw new NotFoundError('Quote not found');
    let query = serverSupabase
      .from('quote_revisions')
      .select(
        'id, quote_id, revision_number, kind, reason, actor_id, before_snapshot, after_snapshot, created_at'
      )
      .eq('quote_id', params.id)
      .eq('contractor_id', user.id)
      .order('revision_number', { ascending: false })
      .limit(51);
    if (before !== null) query = query.lt('revision_number', Number(before));
    const { data, error } = await query;
    if (error || !data)
      throw new InternalServerError('Quote history is unavailable. Try again.');
    const revisions = data.slice(0, 50);
    return NextResponse.json({
      revisions,
      next_before: data.length > 50 ? revisions[49].revision_number : null,
    });
  }
);

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const validation = await validateRequest(request, schema);
    if (validation instanceof NextResponse) return validation;
    const input = validation.data;
    let pricing;
    try {
      pricing = calculateDraftQuotePricing(input.pricing);
    } catch (error) {
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Invalid pricing'
      );
    }
    // The service-only RPC verifies ownership and locks the source quote. No bid,
    // contract, escrow, email or accepted quote is mutated by this endpoint.
    const { data, error } = await serverSupabase.rpc(
      'propose_quote_amendment',
      {
        p_quote_id: params.id,
        p_actor_id: user.id,
        p_request_id: input.request_id,
        p_expected_updated_at: input.expected_updated_at,
        p_reason: input.reason,
        p_pricing: pricing,
      }
    );
    if (error?.code === 'P0002') throw new NotFoundError('Quote not found');
    if (error?.code === '40001')
      throw new ConflictError(
        'Quote or request changed. Review the latest history before trying again.'
      );
    if (error?.code === '22023')
      throw new BadRequestError('Invalid amendment proposal');
    if (error || !data)
      throw new InternalServerError(
        'Could not save amendment proposal. Retry with the same request.'
      );
    return NextResponse.json({ success: true, revision: data });
  }
);
