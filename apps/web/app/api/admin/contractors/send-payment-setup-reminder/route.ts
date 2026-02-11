import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const contractorId = typeof body?.contractorId === 'string' ? body.contractorId.trim() : null;

    if (!contractorId) {
      throw new BadRequestError('Contractor ID required');
    }

    // Get contractor's pending escrows
    const { data: escrows } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        amount,
        jobs!inner (
          contractor_id,
          title
        )
      `)
      .eq('jobs.contractor_id', contractorId)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending']);

    if (escrows && escrows.length > 0) {
      const totalAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
      const jobTitles = escrows.map((e) => (e.jobs as unknown as { title: string }).title).join(', ');

      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        contractorId,
        escrows[0].id,
        `${escrows.length} job(s)`,
        totalAmount
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

