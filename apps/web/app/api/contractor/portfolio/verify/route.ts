import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { PortfolioVerificationService } from '@/lib/services/verification/PortfolioVerificationService';
import { logger } from '@mintenance/shared';

export async function POST(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { portfolioId, action } = body;

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    if (action === 'verify') {
      const success = await PortfolioVerificationService.verifyPortfolioItem(portfolioId, user.id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to verify portfolio item' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Portfolio item verified successfully' });
    }

    if (action === 'unverify') {
      const success = await PortfolioVerificationService.unverifyPortfolioItem(portfolioId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to unverify portfolio item' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Portfolio item unverified successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Error verifying portfolio', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

