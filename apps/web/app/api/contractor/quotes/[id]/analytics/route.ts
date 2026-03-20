import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const trackInteractionSchema = z.object({
  interaction_type: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, trackInteractionSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    // Verify ownership of the quote
    const { data: existing } = await serverSupabase
      .from('contractor_quotes')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Quote not found');
    }

    // Insert interaction record
    const { error: interactionError } = await serverSupabase
      .from('quote_interactions')
      .insert({
        quote_id: id,
        interaction_type: payload.interaction_type,
        interaction_details: payload.metadata || null,
      });

    if (interactionError) {
      logger.error('Error tracking quote interaction', interactionError, { service: 'quote-analytics', quoteId: id });
      throw new InternalServerError('Failed to track quote interaction');
    }

    // Update analytics via RPC (if available)
    const { error: rpcError } = await serverSupabase
      .rpc('update_quote_analytics_on_interaction', {
        p_quote_id: id,
        p_interaction_type: payload.interaction_type,
      });

    if (rpcError) {
      logger.error('Error updating quote analytics', rpcError, { service: 'quote-analytics', quoteId: id });
      // Non-fatal: interaction was recorded, analytics update failed
    }

    return NextResponse.json({ success: true }, { status: 201 });
  }
);
