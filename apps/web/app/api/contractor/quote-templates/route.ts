import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  line_items: z.array(lineItemSchema).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: templates, error } = await serverSupabase
      .from('quote_templates')
      .select('*')
      .eq('contractor_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching quote templates', error, { service: 'quote-templates', userId: user.id });
      throw new InternalServerError('Failed to fetch quote templates');
    }

    return NextResponse.json({ templates: templates || [] });
  }
);

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createTemplateSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    const { data: template, error } = await serverSupabase
      .from('quote_templates')
      .insert({
        contractor_id: user.id,
        template_name: payload.name,
        description: payload.description || null,
        terms_and_conditions: payload.terms || null,
        notes: payload.notes || null,
        is_active: true,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating quote template', error, { service: 'quote-templates', userId: user.id });
      throw new InternalServerError('Failed to create quote template');
    }

    // Insert line item templates if provided
    if (payload.line_items && payload.line_items.length > 0) {
      const lineItems = payload.line_items.map((item, index) => ({
        template_id: template.id,
        description: item.description,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        unit: item.unit || null,
        category: item.category || null,
        sort_order: index + 1,
      }));

      const { error: lineItemsError } = await serverSupabase
        .from('quote_line_item_templates')
        .insert(lineItems);

      if (lineItemsError) {
        logger.error('Error creating template line items', lineItemsError, { service: 'quote-templates', templateId: template.id });
        // Non-fatal: template was created, line items failed
      }
    }

    return NextResponse.json({ template }, { status: 201 });
  }
);
