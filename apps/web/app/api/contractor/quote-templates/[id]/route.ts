import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const PUT = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const { id } = params;

    const validation = await validateRequest(request, updateTemplateSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('quote_templates')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      throw new NotFoundError('Quote template not found');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) updates.template_name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.terms !== undefined) updates.terms_and_conditions = payload.terms;
    if (payload.notes !== undefined) updates.notes = payload.notes;

    const { data: template, error } = await serverSupabase
      .from('quote_templates')
      .update(updates)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating quote template', error, { service: 'quote-templates', userId: user.id });
      throw new InternalServerError('Failed to update quote template');
    }

    return NextResponse.json({ template });
  }
);

export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const { id } = params;

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('quote_templates')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      throw new NotFoundError('Quote template not found');
    }

    // Soft-delete
    const { error } = await serverSupabase
      .from('quote_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting quote template', error, { service: 'quote-templates', userId: user.id });
      throw new InternalServerError('Failed to delete quote template');
    }

    return NextResponse.json({ success: true });
  }
);
