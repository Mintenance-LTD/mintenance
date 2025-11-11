import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EmailService } from '@/lib/email-service';
import { requireCSRF } from '@/lib/csrf';

// Validation schema
const sendQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized send quote attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to send quote', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can send quotes' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendQuoteSchema.parse(body);

    // Verify quote exists and belongs to contractor
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('*')
      .eq('id', validatedData.quoteId)
      .eq('contractor_id', user.id)
      .single();

    if (quoteError || !quote) {
      logger.warn('Attempted to send non-existent or unauthorized quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId,
        contractorId: user.id
      });
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if quote is already sent
    if (quote.status === 'sent' || quote.status === 'accepted') {
      logger.warn('Attempted to resend already sent quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId,
        currentStatus: quote.status
      });
      return NextResponse.json({ error: `Quote is already ${quote.status}` }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to send quote' }, { status: 500 });
    }

    // Send email notification to client
    if (quote.client_email) {
      const contractorName = `${user.first_name} ${user.last_name}`.trim() || user.email;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid send quote data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('Unexpected error in send-quote', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
