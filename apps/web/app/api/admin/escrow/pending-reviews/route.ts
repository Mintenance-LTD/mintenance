import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      logger.warn('Unauthorized attempt to fetch pending reviews', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const reviews = await AdminEscrowHoldService.getPendingAdminReviews(limit);

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('Error fetching pending reviews', error, { service: 'admin-escrow-pending-reviews' });
    return NextResponse.json(
      { error: 'Failed to fetch pending reviews' },
      { status: 500 }
    );
  }
}

