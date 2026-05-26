import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ConflictError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { sanitizeText } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { createPropertySchema } from '@/lib/validation/schemas';
import { getFeatureLimit } from '@/lib/feature-access-config';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';

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
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  // R6 step 13 (2026-04-29): mobile sends device GPS or Mapbox
  // geocoding result; persisted so map / nearby-contractor /
  // geo-pricing features have coords on first load.
  latitude?: number;
  longitude?: number;
}

/**
 * Get all properties for the current user
 * GET /api/properties
 * Rate limit is per-user so one user cannot exhaust the bucket for others (e.g. same IP/localhost).
 */
export const GET = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

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
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    // 2026-05-26 audit-57 P2: support an opt-in `includeShared`
    // query param so callers like QuickJobModal can also include
    // properties the user is a non-owner team member on. Default
    // behaviour (no param) is unchanged: owner-only, RLS-scoped.
    // `includeShared=create_job` returns owned + memberships that
    // confer create_job (owner/admin/manager roles per
    // PropertyTeamService.PERMISSION_MATRIX). Each row carries a
    // `_role` hint so the UI knows whether it owns the property.
    const url = new URL(request.url);
    const includeShared = url.searchParams.get('includeShared');

    const PROPERTY_COLS =
      'id, property_name, address, property_type, is_primary, photos, city, postcode, country, bedrooms, bathrooms, latitude, longitude, created_at, updated_at';

    const { data: ownProperties, error } = await userDb
      .from('properties')
      .select(
        // R6 step 13 (2026-04-29): include `country`, `latitude`,
        // `longitude` so the edit screen + map view can pre-fill /
        // render markers without a second round-trip. Was missing
        // from the column list even though the DB has them.
        PROPERTY_COLS
      )
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

    type PropertyRow = Record<string, unknown> & { id: string };
    const ownTagged: PropertyRow[] = (ownProperties || []).map((p) => ({
      ...(p as PropertyRow),
      _role: 'owner' as const,
    }));

    let result = ownTagged;

    if (includeShared) {
      // Team-member rows expose properties via property_team_members,
      // which is not on properties' RLS policy (audit-15 P1). Read
      // via serverSupabase after PropertyTeamService gates each row
      // by role. Only accepted memberships count.
      //
      // audit-76 follow-up Watch #2: the embedded `properties:property_id`
      // join below is read with service-role and therefore bypasses
      // properties RLS. Safety today rests on two facts: (a) properties
      // use hard-delete with no soft-delete column (per CLAUDE.md), and
      // (b) the membership row pre-gates access via user_id + accepted
      // status. If properties ever gains a soft-delete column or any
      // RLS narrowing beyond ownership, this read needs to route
      // through a new `PropertyTeamService.getAccessibleProperties()`
      // helper that bundles the auth check + filter in one place.
      // TODO(rls-future): swap the service-role embed for a service
      // helper when soft-delete lands.
      const ROLES_WITH_CREATE_JOB =
        includeShared === 'create_job'
          ? ['admin', 'manager'] // owner already covered by the own-properties block
          : ['admin', 'manager', 'viewer'];
      const { data: memberships, error: memErr } = await serverSupabase
        .from('property_team_members')
        .select(`role, property_id, properties:property_id (${PROPERTY_COLS})`)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .in('role', ROLES_WITH_CREATE_JOB);

      if (memErr) {
        logger.warn('Failed to load shared property memberships', {
          service: 'properties',
          userId: user.id,
          err: memErr.message,
        });
        // Don't fail the whole listing — own properties still flow.
      } else if (memberships) {
        // supabase-js types the embedded `properties:property_id (...)`
        // relation as an array even though it's a many-to-one FK; each
        // membership row carries at most one property. Defensively
        // flatMap + filter so we don't crash on stale joins.
        type MemberRow = {
          role: 'admin' | 'manager' | 'viewer';
          property_id: string;
          properties: PropertyRow[] | PropertyRow | null;
        };
        const sharedTagged: PropertyRow[] = (
          memberships as unknown as MemberRow[]
        ).flatMap((m) => {
          const props = Array.isArray(m.properties)
            ? m.properties
            : m.properties
              ? [m.properties]
              : [];
          return props.map((p) => ({
            ...(p as PropertyRow),
            _role: m.role,
          }));
        });
        // De-duplicate against own list (a user could in theory own
        // and have a stale membership row for the same property).
        const ownIds = new Set(ownTagged.map((p) => p.id));
        result = [
          ...ownTagged,
          ...sharedTagged.filter((p) => !ownIds.has(p.id)),
        ];
      }
    }

    return NextResponse.json({
      properties: result,
    });
  }
);

/**
 * Create a new property
 * POST /api/properties
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Enforce property count limit based on subscription tier
    if (user.role === 'homeowner') {
      // Check early access first, then subscription
      const tier = await getEffectiveHomeownerTier(user.id);
      const limit = getFeatureLimit(
        'HOMEOWNER_PROPERTY_LIMIT',
        'homeowner',
        tier
      );

      if (typeof limit === 'number') {
        const { count } = await userDb
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
    const address =
      body.address ||
      [
        body.address_line1,
        body.address_line2,
        body.city,
        body.county,
        body.postcode,
        body.country,
      ]
        .filter(Boolean)
        .join(', ');

    // Normalize property type from both web (house/apartment/condo/townhouse)
    // and mobile (house/flat/bungalow/maisonette/other) vocabularies into the
    // canonical DB values ('residential' | 'commercial'). 'commercial' is
    // reserved for future expansion; everything else maps to 'residential'.
    const RESIDENTIAL_TYPES = new Set([
      'house',
      'flat',
      'apartment',
      'condo',
      'townhouse',
      'bungalow',
      'maisonette',
      'other',
      'residential',
    ]);
    const rawType = (body.property_type || '').toLowerCase();
    const property_type =
      rawType === 'commercial'
        ? 'commercial'
        : RESIDENTIAL_TYPES.has(rawType)
          ? 'residential'
          : body.property_type;

    // Auto-generate property_name if not provided (mobile doesn't send it)
    const property_name =
      body.property_name || body.address_line1 || address.split(',')[0];

    const is_primary = body.is_primary ?? false;

    // If setting as primary, unset all other primary properties for this user
    if (is_primary) {
      await userDb
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

    // Store city/postcode/country if provided (from mobile's split
    // fields). `country` was previously dropped on insert despite
    // being in the schema and the DB column existing — now persisted.
    if (body.city) insertData.city = sanitizeText(body.city, 100);
    if (body.postcode) insertData.postcode = sanitizeText(body.postcode, 20);
    if (body.country) insertData.country = sanitizeText(body.country, 50);
    if (body.bedrooms) insertData.bedrooms = body.bedrooms;
    if (body.bathrooms) insertData.bathrooms = body.bathrooms;

    // Coords from mobile (or future geocoded value from web).
    // `typeof === 'number'` rather than truthy so `0` is preserved.
    if (typeof body.latitude === 'number') {
      insertData.latitude = body.latitude;
    }
    if (typeof body.longitude === 'number') {
      insertData.longitude = body.longitude;
    }

    // Add photos if provided
    if (body.photos && body.photos.length > 0) {
      insertData.photos = body.photos;
    }

    const { data: property, error: createError } = await userDb
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

    // Invalidate cached properties list so the new row appears immediately on redirect.
    // Without this, apps/web/app/properties/page.tsx serves stale cached data for up to 5 minutes.
    try {
      revalidatePath('/properties');
    } catch (err) {
      logger.warn('Failed to revalidate /properties path', {
        service: 'properties',
        err: String(err),
      });
    }

    return NextResponse.json({
      success: true,
      property,
    });
  }
);
