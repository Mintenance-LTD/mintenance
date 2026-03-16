import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/email/templates/[id]/duplicate
 * Duplicate an email template. Verifies ownership.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const templateId = params.id;

    // Fetch original template
    const { data: original, error: fetchError } = await serverSupabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('contractor_id', user.id)
      .single();

    if (fetchError || !original) {
      logger.error('Error fetching template for duplication', fetchError, {
        service: 'email-templates',
        userId: user.id,
        templateId,
      });
      return NextResponse.json(
        { error: 'Template not found or not owned by you' },
        { status: 404 },
      );
    }

    // Insert duplicate with modified name
    const { data: duplicate, error: insertError } = await serverSupabase
      .from('email_templates')
      .insert([{
        contractor_id: user.id,
        template_name: `Copy of ${original.template_name}`,
        template_category: original.template_category,
        template_type: original.template_type,
        subject_line: original.subject_line,
        text_content: original.text_content,
        html_content: original.html_content,
        preview_text: original.preview_text,
        description: `Copy of ${original.description || original.template_name}`,
        is_active: true,
        is_default: false,
        language_code: original.language_code,
        variables: original.variables,
        required_variables: original.required_variables,
        brand_colors: original.brand_colors,
        logo_url: original.logo_url,
        company_signature: original.company_signature,
        footer_content: original.footer_content,
        times_used: 0,
      }])
      .select()
      .single();

    if (insertError) {
      logger.error('Error duplicating email template', insertError, {
        service: 'email-templates',
        userId: user.id,
        templateId,
      });
      throw insertError;
    }

    return NextResponse.json({ data: duplicate }, { status: 201 });
  },
);
