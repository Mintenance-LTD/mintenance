import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

// Validation schema
const deleteQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
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
      logger.warn('Unauthorized delete quote attempt', { service: 'contractor' });
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to delete quote', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      throw new ForbiddenError('Only contractors can delete quotes');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = deleteQuoteSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const validatedData = validation.data;

    // Verify quote exists and belongs to contractor
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('id, status')
      .eq('id', validatedData.quoteId)
      .eq('contractor_id', user.id)
      .single();

    if (quoteError || !quote) {
      logger.warn('Attempted to delete non-existent or unauthorized quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId,
        contractorId: user.id
      });
      throw new NotFoundError('Quote not found');
    }

    // Prevent deletion of accepted quotes
    if (quote.status === 'accepted') {
      logger.warn('Attempted to delete accepted quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId
      });
      throw new BadRequestError('Cannot delete accepted quotes');
    }

    // Delete the quote
    const { error: deleteError } = await serverSupabase
      .from('contractor_quotes')
      .delete()
      .eq('id', validatedData.quoteId)
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete quote', deleteError, {
        service: 'contractor',
        quoteId: validatedData.quoteId
      });
      throw new InternalServerError('Failed to delete quote');
    }

    logger.info('Quote deleted successfully', {
      service: 'contractor',
      quoteId: validatedData.quoteId,
      contractorId: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully'
    });

  } catch (error) {
    return handleAPIError(error);
  }
}
