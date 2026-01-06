import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
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

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const { data: availability, error } = await serverSupabase
      .from('contractor_availability')
      .select('*')
      .eq('contractor_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      logger.error('Error fetching availability', error);
      throw new InternalServerError('Failed to fetch availability');
    }

    // Transform to client format (day names instead of numbers)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const transformedAvailability = availability?.map((slot) => ({
      id: slot.id,
      day: dayNames[slot.day_of_week],
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isAvailable: slot.is_available,
    })) || [];

    return NextResponse.json({ availability: transformedAvailability });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest) {
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

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const body = await request.json();
    const { availability } = body; // Array of availability objects

    if (!Array.isArray(availability)) {
      throw new BadRequestError('Invalid availability data');
    }

    // Delete existing availability
    await serverSupabase
      .from('contractor_availability')
      .delete()
      .eq('contractor_id', user.id);

    // Insert new availability
    const availabilityRecords = availability
      .filter((slot) => slot.isAvailable)
      .map((slot) => ({
        contractor_id: user.id,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_available: slot.isAvailable,
      }));

    if (availabilityRecords.length > 0) {
      const { error: insertError } = await serverSupabase
        .from('contractor_availability')
        .insert(availabilityRecords);

      if (insertError) {
        logger.error('Error updating availability', insertError);
        throw new InternalServerError('Failed to update availability');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
