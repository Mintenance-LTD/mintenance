import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprRequestSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
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

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get user's DSR requests
    const { data: requests, error } = await serverSupabase
      .from('dsr_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching DSR requests', error, {
        service: 'gdpr',
        userId: user.id
      });
      return NextResponse.json({ 
        error: 'Failed to fetch data requests' 
      }, { status: 500 });
    }

    logger.debug('DSR requests fetched successfully', {
      service: 'gdpr',
      userId: user.id,
      requestCount: requests?.length || 0
    });

    return NextResponse.json({ requests });

  } catch (error) {
    logger.error('GDPR requests error', error, { service: 'gdpr' });
    return NextResponse.json(
      { error: 'Failed to fetch data requests' },
      { status: 500 }
    );
  }
}

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
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Validate request body
    const validation = await validateRequest(request, gdprRequestSchema);
    if ('headers' in validation) {
      return validation; // Return NextResponse error
    }

    const { request_type, notes } = validation.data;

    // Check for existing pending request of same type
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', request_type)
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        error: `You already have a pending ${request_type} request` 
      }, { status: 400 });
    }

    // Create new DSR request
    const { data: dsrRequest, error } = await serverSupabase
      .from('dsr_requests')
      .insert({
        user_id: user.id,
        request_type,
        status: 'pending',
        requested_by: user.id,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating DSR request', error, {
        service: 'gdpr',
        userId: user.id,
        requestType: request_type
      });
      return NextResponse.json({ 
        error: 'Failed to create data request' 
      }, { status: 500 });
    }

    logger.info('DSR request created successfully', {
      service: 'gdpr',
      userId: user.id,
      requestType: request_type,
      requestId: dsrRequest.id
    });

    return NextResponse.json({
      message: 'Data request created successfully',
      request: dsrRequest
    });

  } catch (error) {
    logger.error('GDPR request creation error', error, { service: 'gdpr' });
    return NextResponse.json(
      { error: 'Failed to create data request' },
      { status: 500 }
    );
  }
}
