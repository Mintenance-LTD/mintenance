import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const reviews = await AdminEscrowHoldService.getPendingAdminReviews(limit);

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    return handleAPIError(error);
  }
}

