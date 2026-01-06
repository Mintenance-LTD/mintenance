import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Handle swipe actions on the Discover page
 * POST /api/discover/swipe
 * 
 * For contractors: tracks job views and creates bid/interest
 * For homeowners: tracks contractor matches
 */
export async function POST(request: NextRequest) {
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

    
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to swipe');
    }

    const body = await request.json();
    const { action, itemId, itemType } = body;

    if (!action || !itemId || !itemType) {
      throw new BadRequestError('Missing required fields: action, itemId, itemType');
    }

    if (!['like', 'pass', 'super_like', 'maybe'].includes(action)) {
      throw new BadRequestError('Invalid action. Must be: like, pass, super_like, or maybe');
    }

    const isContractor = user.role === 'contractor';
    const isHomeowner = user.role === 'homeowner';

    // For contractors swiping on jobs
    if (isContractor && itemType === 'job') {
      // Check subscription requirement for contractors
      const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
      const subscriptionCheck = await requireSubscriptionForAction(request, 'swipe_job');
      if (subscriptionCheck) {
        return subscriptionCheck;
      }

      // Always track view when contractor sees a job
      await serverSupabase
        .from('job_views')
        .upsert({
          job_id: itemId,
          contractor_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'job_id,contractor_id',
        });

      // If contractor swiped right (like), create a bid to show interest
      if (action === 'like' || action === 'super_like') {
        // Check if bid already exists
        const { data: existingBid } = await serverSupabase
          .from('bids')
          .select('id')
          .eq('job_id', itemId)
          .eq('contractor_id', user.id)
          .single();

        // Only create bid if it doesn't exist
        if (!existingBid) {
          // Fetch job to get budget for default bid amount
          const { data: job } = await serverSupabase
            .from('jobs')
            .select('budget')
            .eq('id', itemId)
            .single();

          const bidAmount = job?.budget ? parseFloat(job.budget.toString()) : 0;

          await serverSupabase
            .from('bids')
            .insert({
              job_id: itemId,
              contractor_id: user.id,
              amount: bidAmount,
              status: 'pending',
              message: action === 'super_like' ? 'Super interested in this job!' : '',
            });
        }

        // Check for match (if homeowner previously liked this contractor for this job)
        // This would require checking if homeowner has a match with this contractor
        // For now, we'll return success without match detection
        return NextResponse.json({
          success: true,
          action: 'like',
          matched: false,
        });
      }

      // If contractor passed, just track the view
      return NextResponse.json({
        success: true,
        action: 'pass',
      });
    }

    // For homeowners swiping on contractors
    if (isHomeowner && itemType === 'contractor') {
      // Track match action
      const matchAction = action === 'like' || action === 'super_like' ? 'like' : 'pass';

      // Upsert match record
      const { error: matchError } = await serverSupabase
        .from('contractor_matches')
        .upsert({
          homeowner_id: user.id,
          contractor_id: itemId,
          action: matchAction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'homeowner_id,contractor_id',
        });

      if (matchError) {
        logger.error('Error saving contractor match', matchError, {
          service: 'discover',
          userId: user.id,
          contractorId: itemId,
          action: matchAction,
        });
        throw new InternalServerError('Failed to save match');
      }

      // Check for mutual match (contractor also liked this homeowner's job)
      // This would require checking contractor's interest in homeowner's jobs
      // For now, return success
      return NextResponse.json({
        success: true,
        action: matchAction,
        matched: false,
      });
    }

    throw new BadRequestError('Invalid user role or item type combination');
  } catch (error) {
    return handleAPIError(error);
  }
}

