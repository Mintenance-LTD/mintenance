import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { updatePropertySchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const { data, error } = await serverSupabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single();

  if (error || !data) {
    throw new NotFoundError('Property not found');
  }

  return NextResponse.json(data);
});

export const PUT = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
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
    type,
    bedrooms,
    bathrooms,
    squareFeet,
    yearBuilt,
    photos,
  } = validation.data;

  // Update the property in the database
  const { data, error } = await serverSupabase
    .from('properties')
    .update({
      property_name: name,
      address,
      city,
      postcode,
      property_type: type,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      square_footage: squareFeet || null,
      year_built: yearBuilt || null,
      photos: photos || [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('owner_id', user.id)
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
});

export const DELETE = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  // Delete the property from the database
  const { error } = await serverSupabase
    .from('properties')
    .delete()
    .eq('id', params.id)
    .eq('owner_id', user.id);

  if (error) {
    logger.error('Error deleting property', error, {
      service: 'properties',
      propertyId: params.id,
      userId: user.id,
    });
    throw error;
  }

  return NextResponse.json({ success: true });
});
