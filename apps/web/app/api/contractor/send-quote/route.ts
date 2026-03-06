import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { getAppUrl } from '@/lib/env';

// Validation schema
const sendQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    // Parse and validate request body
    const body = await request.json();
    const validation = sendQuoteSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const validatedData = validation.data;

    // Verify quote exists and belongs to contractor
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('id, status, client_email, client_name, quote_number, total_amount')
      .eq('id', validatedData.quoteId)
      .eq('contractor_id', user.id)
      .single();

    if (quoteError || !quote) {
      logger.warn('Attempted to send non-existent or unauthorized quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId,
        contractorId: user.id
      });
      throw new NotFoundError('Quote not found');
    }

    // Check if quote is already sent
    if (quote.status === 'sent' || quote.status === 'accepted') {
      logger.warn('Attempted to resend already sent quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId,
        currentStatus: quote.status
      });
      throw new BadRequestError(`Quote is already ${quote.status}`);
    }

    // Update quote status to sent
    const { error: updateError } = await serverSupabase
      .from('contractor_quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', validatedData.quoteId)
      .eq('contractor_id', user.id);

    if (updateError) {
      logger.error('Failed to update quote status', updateError, {
        service: 'contractor',
        quoteId: validatedData.quoteId
      });
      throw new InternalServerError('Failed to send quote');
    }

    // Send email notification to client
    if (quote.client_email) {
      const contractorName = `${user.first_name} ${user.last_name}`.trim() || user.email;
      const baseUrl = getAppUrl();

      await EmailService.sendQuoteNotification(quote.client_email, {
        recipientName: quote.client_name || 'Valued Client',
        contractorName,
        quoteNumber: quote.quote_number,
        totalAmount: parseFloat(quote.total_amount),
        viewUrl: `${baseUrl}/quotes/${quote.id}`,
      });
    }

    logger.info('Quote sent successfully', {
      service: 'contractor',
      quoteId: validatedData.quoteId,
      contractorId: user.id,
      clientEmail: quote.client_email
    });

    return NextResponse.json({
      success: true,
      message: 'Quote sent successfully',
      quoteId: validatedData.quoteId
    });
  }
);
