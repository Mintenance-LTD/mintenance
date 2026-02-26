import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { PortfolioVerificationService } from '@/lib/services/verification/PortfolioVerificationService';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const verifyPortfolioSchema = z.object({
  portfolioId: z.string().uuid(),
  action: z.enum(['verify', 'unverify']),
});

export const POST = withApiHandler(
  { roles: ['admin'] },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = verifyPortfolioSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Portfolio ID (UUID) and action (verify/unverify) are required');
    }

    const { portfolioId, action } = parsed.data;

    if (action === 'verify') {
      const success = await PortfolioVerificationService.verifyPortfolioItem(portfolioId, user.id);
      if (!success) {
        throw new InternalServerError('Failed to verify portfolio item');
      }
      return NextResponse.json({ message: 'Portfolio item verified successfully' });
    }

    if (action === 'unverify') {
      const success = await PortfolioVerificationService.unverifyPortfolioItem(portfolioId);
      if (!success) {
        throw new InternalServerError('Failed to unverify portfolio item');
      }
      return NextResponse.json({ message: 'Portfolio item unverified successfully' });
    }

    throw new BadRequestError('Invalid action');
  }
);
