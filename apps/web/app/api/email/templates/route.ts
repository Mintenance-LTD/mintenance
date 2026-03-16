import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  category: z.string().max(100).optional(),
});

/**
 * GET /api/email/templates
 * List email templates for the authenticated contractor.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 60 }, csrf: false },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('email_templates')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching email templates', error, {
        service: 'email-templates',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ data: data || [] });
  },
);

/**
 * POST /api/email/templates
 * Create a new email template.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createTemplateSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: payload } = validation;

    const { data, error } = await serverSupabase
      .from('email_templates')
      .insert([{
        contractor_id: user.id,
        template_name: payload.name,
        subject_line: payload.subject,
        text_content: payload.body,
        template_category: payload.category || 'general',
        is_active: true,
        is_default: false,
        times_used: 0,
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating email template', error, {
        service: 'email-templates',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  },
);
