import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EmailService } from '@/lib/email-service';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

// Validation schema
const sendQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized send quote attempt', { service: 'contractor' });
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to send quote', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      throw new ForbiddenError('Only contractors can send quotes');
    }

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
    return handleAPIError(error);
  }
}
