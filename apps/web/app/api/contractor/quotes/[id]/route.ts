import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger, calculateDraftQuotePricing } from '@mintenance/shared';
import {
  InternalServerError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { deleteDraftQuote } from '@/lib/quotes/delete-draft-quote';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0).optional(),
});

const updateQuoteSchema = z
  .object({
    expected_status: z.literal('draft').optional(),
    expected_updated_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    pricing: z
      .object({
        line_items: z
          .array(lineItemSchema.omit({ total: true }).strict())
          .min(1)
          .max(100),
        tax_rate_percent: z.number().min(0).max(100),
      })
      .strict()
      .optional(),
    title: z.string().trim().min(1).max(255).optional(),
    client_name: z.string().trim().min(1).max(200).optional(),
    terms: z.string().max(5000).optional(),
    notes: z.string().max(5000).optional(),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, 'Enter a valid date')
      .nullable()
      .optional(),
  })
  .strict();

export const PUT = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, updateQuoteSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    if (
      payload.pricing &&
      (payload.expected_status !== 'draft' ||
        payload.expected_updated_at === undefined)
    ) {
      throw new BadRequestError(
        'Price edits require a versioned draft and a complete pricing breakdown.'
      );
    }
    let pricingUpdates;
    if (payload.pricing) {
      try {
        pricingUpdates = calculateDraftQuotePricing(payload.pricing);
      } catch (error) {
        throw new BadRequestError(
          error instanceof Error ? error.message : 'Invalid pricing.'
        );
      }
    }

    // Verify ownership
    const { data: existing, error: ownershipError } = await serverSupabase
      .from('contractor_quotes')
      .select('id, status, updated_at')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .maybeSingle();

    if (ownershipError) throw new InternalServerError('Failed to load quote');
    if (!existing) {
      throw new NotFoundError('Quote not found');
    }
    if (existing.status !== 'draft') {
      throw new ConflictError(
        'Only draft quotes can be edited. Review the current quote.'
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...pricingUpdates,
    };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.client_name !== undefined)
      updates.client_name = payload.client_name;
    if (payload.terms !== undefined) updates.terms = payload.terms;
    if (payload.notes !== undefined) updates.notes = payload.notes;
    if (payload.valid_until !== undefined)
      updates.valid_until = payload.valid_until;

    let updateQuery = serverSupabase
      .from('contractor_quotes')
      .update(updates)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .eq('status', 'draft');
    // Even older details-only callers cannot overwrite a concurrently sent draft.
    const version =
      payload.expected_updated_at !== undefined
        ? payload.expected_updated_at
        : existing.updated_at;
    updateQuery =
      version == null
        ? updateQuery.is('updated_at', null)
        : updateQuery.eq('updated_at', version);
    const { data: quote, error } = await updateQuery.select().maybeSingle();

    if (error) {
      logger.error('Error updating quote', error, {
        service: 'quotes',
        userId: user.id,
      });
      throw new InternalServerError('Failed to update quote');
    }

    if (!quote) {
      throw new ConflictError(
        'Quote changed since it was loaded. Reload before editing.'
      );
    }
    return NextResponse.json({ quote });
  }
);

const deleteSchema = z
  .object({
    expected_updated_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  })
  .strict();

export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // Older mobile callers send no body. They still receive a draft/version guard.
    const text = await request.text();
    let body: unknown = {};
    try {
      if (text.trim()) body = JSON.parse(text);
    } catch {
      throw new BadRequestError('Invalid request data');
    }
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestError('Invalid request data');
    await deleteDraftQuote(params.id, user.id, parsed.data.expected_updated_at);
    return NextResponse.json({ success: true });
  }
);
