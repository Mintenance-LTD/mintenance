import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError } from '@/lib/errors/api-error';
import { recordCompletionReview } from '@/lib/services/escrow/homeowner-approval/record-review';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    let body: unknown;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = z
      .object({
        completedAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional(),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new BadRequestError('Invalid completion version');
    const escrowId = params.id;
    await recordCompletionReview({
      escrowId,
      actorId: user.id,
      action: 'inspect',
      completedAt: parsed.data.completedAt,
    });
    return NextResponse.json({ success: true, escrowId });
  }
);
