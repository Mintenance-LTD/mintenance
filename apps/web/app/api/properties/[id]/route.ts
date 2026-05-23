import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { updatePropertySchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // 2026-05-23 audit-15 P1: previously this route ran the
    // PropertyTeamService.authorize() gate and THEN read through
    // `createRequestScopedClient` (RLS-bound to the caller). Live
    // properties RLS only grants SELECT to owner / admin / org_member —
    // property_team_members are not on the policy. Accepted team
    // members would pass the in-code authorize() check then get
    // `data: null` from the RLS read and see a confusing 404. The
    // authorize() call IS the security boundary here (the same
    // pattern audit-12 #62 adopted for the access PATCH and audit-14
    // #78 adopted for the contractor property-access read), so using
    // serverSupabase after a verified authorize() is consistent.

    // Allow property owner OR team members with any role to view
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'view'
    );

    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    const { data, error } = await serverSupabase
      .from('properties')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundError('Property not found');
    }

    return NextResponse.json(data);
  }
);

export const PUT = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // 2026-05-23 audit-15 P1: same fix as GET above — managers (a
    // property_team_members role) pass the in-code edit() gate but
    // RLS UPDATE on properties only grants owner. The userDb update
    // returned `data: null` for every manager edit and the route 404'd
    // even though the authorize check succeeded. Service-role write
    // after a verified authorize() restores parity between the security
    // check and the storage layer.

    // Require manager+ role for edits
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to edit this property'
      );
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, updatePropertySchema);
    if ('headers' in validation) {
      return validation;
    }

    const {
      name,
      address,
      city,
      postcode,
      country,
      type,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      photos,
      latitude,
      longitude,
    } = validation.data;

    // Build the update payload conditionally so we don't overwrite
    // existing values with `undefined` when the client only sends a
    // subset. Previously every field was unconditionally set, which
    // also meant lat/long were never persisted on edit because
    // `undefined` shadowed any prior value (and the schema didn't
    // accept them anyway — fixed in step 13).
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.property_name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (postcode !== undefined) updateData.postcode = postcode;
    if (country !== undefined) updateData.country = country;
    if (type !== undefined) updateData.property_type = type;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms ?? null;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms ?? null;
    // 2026-05-21 bug fix: the DB CHECK constraint
    // `properties_square_footage_check` rejects `square_footage = 0`
    // (must be > 0 OR null), and `properties_year_built_check`
    // requires year >= 1800. The form initialises both fields with
    // `parseInt(value) || 0`, so a user who clears the input sends
    // `0` → DB returns 23514 → "Database operation failed" 500.
    // Coerce 0 → null here so the value parks as "unknown" instead.
    if (squareFeet !== undefined) {
      updateData.square_footage =
        squareFeet === null || squareFeet === 0 ? null : squareFeet;
    }
    if (yearBuilt !== undefined) {
      updateData.year_built =
        yearBuilt === null || yearBuilt === 0 ? null : yearBuilt;
    }
    if (photos !== undefined) updateData.photos = photos || [];
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    const { data, error } = await serverSupabase
      .from('properties')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating property', error, {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
      });
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Property not found or not authorized');
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Only property owner can delete
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'delete'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'Only the property owner can delete this property'
      );
    }

    // Delete the property from the database
    const { error } = await userDb
      .from('properties')
      .delete()
      .eq('id', params.id);

    if (error) {
      logger.error('Error deleting property', error, {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true });
  }
);
