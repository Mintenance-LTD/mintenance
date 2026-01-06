import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { handleAPIError, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view dispute');
    }

    const { id: disputeId } = await params;

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(disputeId)) {
      throw new BadRequestError('Invalid dispute ID format');
    }

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: dispute, error } = await serverSupabase
      .from('escrow_payments')
      .select('*')
      .eq('id', disputeId)
      .or(`contractor_id.eq.${user.id},client_id.eq.${user.id}${user.role === 'admin' ? ',id.neq.null' : ''}`)
      .single();

    if (error || !dispute) {
      // Don't reveal if dispute exists or not - return generic error
      throw new NotFoundError('Dispute not found or access denied');
    }

    // Additional admin check if needed
    if (user.role !== 'admin' && dispute.contractor_id !== user.id && dispute.client_id !== user.id) {
      throw new ForbiddenError('Not authorized to view this dispute');
    }

    return NextResponse.json(dispute);
  } catch (error) {
    return handleAPIError(error);
  }
}

