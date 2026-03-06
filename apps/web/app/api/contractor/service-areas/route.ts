import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';
import { z } from 'zod';

const createServiceAreaSchema = z.object({
  area_name: z.string().min(1, 'Area name is required').max(255),
  description: z.string().max(500).optional(),
  area_type: z.enum(['radius', 'postal_codes', 'cities']).default('radius'),
  center_latitude: z.number().min(-90).max(90).optional(),
  center_longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().min(1).max(200).optional(),
  postal_codes: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  is_primary_area: z.boolean().default(false),
});

/**
 * GET /api/contractor/service-areas
 * Fetch all service areas for the authenticated contractor
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('service_areas')
      .select('*')
      .eq('contractor_id', user.id)
      .order('priority_level', { ascending: true });

    if (error) {
      logger.error('Error fetching service areas', error);
      throw new InternalServerError('Failed to fetch service areas');
    }

    return NextResponse.json({ success: true, data: data || [] });
  }
);

/**
 * POST /api/contractor/service-areas
 * Create a new service area for the authenticated contractor
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createServiceAreaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      area_name,
      description,
      area_type,
      center_latitude,
      center_longitude,
      radius_km,
      postal_codes,
      cities,
      is_primary_area,
    } = parsed.data;

    // Validate radius fields if type is 'radius'
    if (area_type === 'radius') {
      if (!center_latitude || !center_longitude) {
        return NextResponse.json(
          { error: 'center_latitude and center_longitude are required for radius areas' },
          { status: 400 }
        );
      }
      if (!radius_km) {
        return NextResponse.json(
          { error: 'radius_km is required for radius areas' },
          { status: 400 }
        );
      }
    }

    // If this is the primary area, unset existing primary
    if (is_primary_area) {
      await serverSupabase
        .from('service_areas')
        .update({ is_primary_area: false })
        .eq('contractor_id', user.id)
        .eq('is_primary_area', true);
    }

    const { data: newArea, error: insertError } = await serverSupabase
      .from('service_areas')
      .insert({
        contractor_id: user.id,
        area_name,
        description: description ?? null,
        area_type,
        center_latitude: center_latitude ?? null,
        center_longitude: center_longitude ?? null,
        radius_km: radius_km ?? null,
        postal_codes: postal_codes ?? null,
        cities: cities ?? null,
        is_primary_area,
        is_active: true,
        priority_level: 1,
        base_travel_charge: 0,
        per_km_rate: 0,
        minimum_job_value: 0,
        response_time_hours: 24,
        weekend_surcharge: 0,
        evening_surcharge: 0,
        emergency_available: false,
        emergency_surcharge: 0,
        preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        preferred_hours: { start: '09:00', end: '17:00' },
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A service area with this name already exists' },
          { status: 409 }
        );
      }
      logger.error('Error creating service area', insertError);
      throw new InternalServerError('Failed to create service area');
    }

    // Mark contractor as visible on map when they have an active service area
    await serverSupabase
      .from('profiles')
      .update({ is_visible_on_map: true })
      .eq('id', user.id);

    return NextResponse.json({ success: true, data: newArea }, { status: 201 });
  }
);
