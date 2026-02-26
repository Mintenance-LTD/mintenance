import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const deleteQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

/**
 * DELETE /api/contractor/delete-quote - delete a contractor's own quote.
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const body = await request.json();
    const validation = deleteQuoteSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const { quoteId } = validation.data;

    // Verify quote exists and belongs to contractor
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('id, status')
      .eq('id', quoteId)
      .eq('contractor_id', user.id)
      .single();

    if (quoteError || !quote) {
      throw new NotFoundError('Quote not found');
    }

    if (quote.status === 'accepted') {
      throw new BadRequestError('Cannot delete accepted quotes');
    }

    const { error: deleteError } = await serverSupabase
      .from('contractor_quotes')
      .delete()
      .eq('id', quoteId)
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete quote', deleteError, {
        service: 'contractor',
        quoteId,
      });
      throw new InternalServerError('Failed to delete quote');
    }

    logger.info('Quote deleted successfully', {
      service: 'contractor',
      quoteId,
      contractorId: user.id,
    });

    return NextResponse.json({ success: true, message: 'Quote deleted successfully' });
  },
);
