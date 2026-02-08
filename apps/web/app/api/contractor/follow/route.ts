import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

const supabase = serverSupabase;

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

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required to follow other contractors');
    }

    const followSchema = z.object({
      contractor_id: z.string().uuid('contractor_id must be a valid UUID'),
    });

    const validation = await validateRequest(request, followSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;
    const { contractor_id } = data;

    if (contractor_id === user.id) {
      throw new BadRequestError('You cannot follow yourself');
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', contractor_id)
      .eq('role', 'contractor')
      .single();

    if (contractorError || !contractor) {
      throw new NotFoundError('Contractor not found');
    }

    // Check if already following
    const { data: existingFollow, error: followCheckError } = await supabase
      .from('contractor_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', contractor_id)
      .single();

    if (followCheckError && followCheckError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      logger.error('Error checking existing follow', followCheckError, {
        service: 'contractor_follow',
        userId: user.id,
        contractorId: contractor_id,
      });
      throw new InternalServerError('Failed to check follow status');
    }

    if (existingFollow) {
      // Unfollow: delete the follow relationship
      const { error: deleteError } = await supabase
        .from('contractor_follows')
        .delete()
        .eq('id', existingFollow.id);

      if (deleteError) {
        logger.error('Error unfollowing contractor', deleteError, {
          service: 'contractor_follow',
          userId: user.id,
          contractorId: contractor_id,
        });
        throw new InternalServerError('Failed to unfollow contractor');
      }

      return NextResponse.json({ 
        following: false,
        message: 'Unfollowed successfully' 
      });
    } else {
      // Follow: create the follow relationship
      const { data: newFollow, error: insertError } = await supabase
        .from('contractor_follows')
        .insert({
          follower_id: user.id,
          following_id: contractor_id,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Error following contractor', insertError, {
          service: 'contractor_follow',
          userId: user.id,
          contractorId: contractor_id,
        });
        throw new InternalServerError('Failed to follow contractor');
      }

      return NextResponse.json({
        following: true,
        message: 'Followed successfully',
        follow: newFollow
      }, { status: 201 });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

