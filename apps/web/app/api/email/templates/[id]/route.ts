import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  category: z.string().max(100).optional(),
});

/**
 * PUT /api/email/templates/[id]
 * Update an email template. Verifies ownership.
 */
export const PUT = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const templateId = params.id;

    const validation = await validateRequest(request, updateTemplateSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: payload } = validation;

    // Build update object from provided fields
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.template_name = payload.name;
    if (payload.subject !== undefined) updates.subject_line = payload.subject;
    if (payload.body !== undefined) updates.text_content = payload.body;
    if (payload.category !== undefined) updates.template_category = payload.category;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 },
      );
    }

    const { data, error } = await serverSupabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating email template', error, {
        service: 'email-templates',
        userId: user.id,
        templateId,
      });
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Template not found or not owned by you' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  },
);

/**
 * DELETE /api/email/templates/[id]
 * Delete an email template. Verifies ownership.
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const templateId = params.id;

    const { error, count } = await serverSupabase
      .from('email_templates')
      .delete()
      .eq('id', templateId)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting email template', error, {
        service: 'email-templates',
        userId: user.id,
        templateId,
      });
      throw error;
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Template not found or not owned by you' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  },
);
