import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const createEmailHistorySchema = z.object({
  template_id: z.string().uuid().optional(),
  recipient_email: z.string().email().max(320),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(100000),
});

/**
 * POST /api/email/history
 * Log a sent email and optionally update template last_used timestamp.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, createEmailHistorySchema);
    if (validation instanceof NextResponse) return validation;
    const { data: payload } = validation;

    // Insert email history record
    const { data, error } = await serverSupabase
      .from('email_history')
      .insert([{
        contractor_id: user.id,
        template_id: payload.template_id,
        recipient_email: payload.recipient_email,
        subject_line: payload.subject,
        text_content: payload.body,
        status: 'sent',
        send_attempts: 1,
        open_count: 0,
        click_count: 0,
        context_type: 'manual',
        context_data: {},
        device_info: {},
        location_info: {},
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error logging email history', error, {
        service: 'email-history',
        userId: user.id,
      });
      throw error;
    }

    // Update template last_used if template_id was provided
    if (payload.template_id) {
      const { error: updateError } = await serverSupabase
        .from('email_templates')
        .update({ last_used: new Date().toISOString() })
        .eq('id', payload.template_id)
        .eq('contractor_id', user.id);

      if (updateError) {
        logger.error('Error updating template last_used', updateError, {
          service: 'email-history',
          userId: user.id,
          templateId: payload.template_id,
        });
        // Non-critical — don't throw, the history record was already created
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  },
);
