import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/config';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { amendmentError } from '@/lib/quotes/amendment-api';
const schema = z
  .object({
    action: z.enum(['publish', 'approve', 'reject', 'withdraw', 'apply']),
    expected_version: z.number().int().min(0).max(2147483646),
    confirmed: z.literal(true),
    note: z.string().trim().max(2000).default(''),
  })
  .strict();
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const validation = await validateRequest(request, schema);
    if (validation instanceof NextResponse) return validation;
    const { action, expected_version, note } = validation.data;
    const { data, error } = await serverSupabase.rpc(
      'transition_quote_amendment',
      {
        p_job: params.id,
        p_revision: params.revisionId,
        p_actor: user.id,
        p_action: action,
        p_expected_version: expected_version,
        p_note: note,
      }
    );
    amendmentError(error);
    if (!data?.id)
      throw new InternalServerError(
        'Could not confirm amendment outcome. Refresh before continuing.'
      );
    let warning: string | undefined;
    if (data.status === 'applied') {
      try {
        revalidateTag(CACHE_TAGS.USER_BIDS, { expire: 0 });
      } catch (error) {
        logger.warn('Amendment applied but quote cache refresh failed', {
          service: 'quotes',
          error,
        });
        warning =
          'Pricing was applied. Cached dashboard data may take a minute to refresh.';
      }
    }
    return NextResponse.json({ amendment: data, warning });
  }
);
