import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getUserFromRequest } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError, ConflictError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { sanitizeText } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { createPropertySchema } from '@/lib/validation/schemas';
import { getFeatureLimit, type HomeownerSubscriptionTier } from '@/lib/feature-access-config';

// Type definition for property insert data
interface PropertyInsertData {
  owner_id: string;
  property_name: string;
  address: string;
  property_type: string;
  is_primary: boolean;
  photos?: string[];
  city?: string;
  postcode?: string;
  bedrooms?: number;
  bathrooms?: number;
}

/**
 * Get all properties for the current user
 * GET /api/properties
 * Rate limit is per-user so one user cannot exhaust the bucket for others (e.g. same IP/localhost).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required to view properties');
    }

    // Per-user rate limit: 60 GETs per minute per user (avoids 429 on quick-create when session + properties load)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `properties:get:${user.id}`,
      windowMs: 60000,
      maxRequests: 60,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(60),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const { data: properties, error } = await serverSupabase
      .from('properties')
      .select('id, property_name, address, property_type, is_primary, photos, city, postcode, bedrooms, bathrooms, created_at, updated_at')
      .eq('owner_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch properties', error, {
        userId: user.id,
        service: 'properties',
      });
      throw error;
    }

    return NextResponse.json({
      properties: properties || [],
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Create a new property
 * POST /api/properties
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

    // CSRF protection (skip for mobile Bearer token auth)
    const hasBearerToken = request.headers.get('authorization')?.startsWith('Bearer ');
    if (!hasBearerToken) {
      await requireCSRF(request);
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required to create properties');
    }

    // Enforce property count limit based on subscription tier
    if (user.role === 'homeowner') {
      // Get user's subscription tier
      const { data: sub } = await serverSupabase
        .from('homeowner_subscriptions')
        .select('plan_type')
        .eq('homeowner_id', user.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const tier = (sub?.plan_type as HomeownerSubscriptionTier) || 'free';
      const limit = getFeatureLimit('HOMEOWNER_PROPERTY_LIMIT', 'homeowner', tier);

      if (typeof limit === 'number') {
        const { count } = await serverSupabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        const currentCount = count || 0;
        if (currentCount >= limit) {
          return NextResponse.json(
            {
              error: `Property limit reached. Your ${tier === 'free' ? 'Free' : tier} plan allows ${limit} ${limit === 1 ? 'property' : 'properties'}.`,
              limit,
              current: currentCount,
              upgradeUrl: '/subscription-plans',
            },
            { status: 403 }
          );
        }
      }
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, createPropertySchema);
    if ('headers' in validation) {
      return validation;
    }

    const body = validation.data;

    // Compose address from mobile's split fields or use web's single address
    const address = body.address
      || [body.address_line1, body.address_line2, body.city, body.county, body.postcode, body.country]
          .filter(Boolean)
          .join(', ');

    // Map mobile property types to DB types
    const typeMap: Record<string, string> = {
      house: 'residential', flat: 'residential', bungalow: 'residential',
      maisonette: 'residential', other: 'residential',
    };
    const property_type = typeMap[body.property_type] || body.property_type;

    // Auto-generate property_name if not provided (mobile doesn't send it)
    const property_name = body.property_name || body.address_line1 || address.split(',')[0];

    const is_primary = body.is_primary ?? false;

    // If setting as primary, unset all other primary properties for this user
    if (is_primary) {
      await serverSupabase
        .from('properties')
        .update({ is_primary: false })
        .eq('owner_id', user.id)
        .eq('is_primary', true);
    }

    // Create the property with sanitized data
    const insertData: PropertyInsertData = {
      owner_id: user.id,
      property_name: sanitizeText(property_name, 255),
      address: sanitizeText(address, 500),
      property_type,
      is_primary,
    };

    // Store city/postcode if provided (from mobile's split fields)
    if (body.city) insertData.city = sanitizeText(body.city, 100);
    if (body.postcode) insertData.postcode = sanitizeText(body.postcode, 20);
    if (body.bedrooms) insertData.bedrooms = body.bedrooms;
    if (body.bathrooms) insertData.bathrooms = body.bathrooms;

    // Add photos if provided
    if (body.photos && body.photos.length > 0) {
      insertData.photos = body.photos;
    }

    const { data: property, error: createError } = await serverSupabase
      .from('properties')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create property', createError, {
        userId: user.id,
        service: 'properties',
        errorCode: createError.code,
        errorMessage: createError.message,
        errorDetails: createError.details,
      });

      // Handle duplicate or constraint errors
      if (createError.code === '23505') {
        throw new ConflictError('A property with this name already exists');
      }

      throw createError;
    }

    logger.info('Property created successfully', {
      propertyId: property.id,
      userId: user.id,
      service: 'properties',
    });

    return NextResponse.json({
      success: true,
      property,
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

