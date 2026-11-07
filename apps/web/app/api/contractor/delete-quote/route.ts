import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { deleteDraftQuote } from '@/lib/quotes/delete-draft-quote';

const schema = z
  .object({
    quoteId: z.string().uuid(),
    expected_updated_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  })
  .strict();

/** Compatibility route; shares the same draft/version guard as quotes/[id]. */
export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BadRequestError('Invalid request data');
    await deleteDraftQuote(
      parsed.data.quoteId,
      user.id,
      parsed.data.expected_updated_at
    );
    return NextResponse.json({ success: true, message: 'Draft deleted' });
  }
);
