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
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Allow property owner OR team members with any role to view
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'view'
    );

    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    const { data, error } = await userDb
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
    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

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
    if (squareFeet !== undefined)
      updateData.square_footage = squareFeet ?? null;
    if (yearBuilt !== undefined) updateData.year_built = yearBuilt ?? null;
    if (photos !== undefined) updateData.photos = photos || [];
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    const { data, error } = await userDb
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
