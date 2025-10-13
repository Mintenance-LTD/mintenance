import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

// Validation schema
const deleteQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized delete quote attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to delete quote', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can delete quotes' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = deleteQuoteSchema.parse(body);

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
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Prevent deletion of accepted quotes
    if (quote.status === 'accepted') {
      logger.warn('Attempted to delete accepted quote', {
        service: 'contractor',
        quoteId: validatedData.quoteId
      });
      return NextResponse.json({ error: 'Cannot delete accepted quotes' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
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
    if (error instanceof z.ZodError) {
      logger.warn('Invalid delete quote data', {
        service: 'contractor',
        errors: error.errors
      });
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    logger.error('Unexpected error in delete-quote', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
