import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0).optional(),
});

const updateQuoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  client_name: z.string().max(200).optional(),
  total_amount: z.number().min(0).optional(),
  status: z.string().max(50).optional(),
  line_items: z.array(lineItemSchema).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  valid_until: z.string().optional(),
});

export const PUT = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, updateQuoteSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('contractor_quotes')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Quote not found');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.client_name !== undefined) updates.client_name = payload.client_name;
    if (payload.total_amount !== undefined) updates.total_amount = payload.total_amount;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.line_items !== undefined) updates.line_items = payload.line_items;
    if (payload.terms !== undefined) updates.terms = payload.terms;
    if (payload.notes !== undefined) updates.notes = payload.notes;
    if (payload.valid_until !== undefined) updates.valid_until = payload.valid_until;

    const { data: quote, error } = await serverSupabase
      .from('contractor_quotes')
      .update(updates)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating quote', error, { service: 'quotes', userId: user.id });
      throw new InternalServerError('Failed to update quote');
    }

    return NextResponse.json({ quote });
  }
);
