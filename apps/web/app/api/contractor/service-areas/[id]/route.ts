import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { z } from 'zod';

const updateServiceAreaSchema = z.object({
  area_name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  radius_km: z.number().min(1).max(200).optional(),
  // The outer threshold a contractor will still travel to, billed at
  // `per_km_rate`. Must stay >= radius_km — enforced against the MERGED
  // row below, not here, because a PATCH may send either field alone.
  max_distance_km: z.number().min(1).max(200).optional(),
  center_latitude: z.number().min(-90).max(90).optional(),
  center_longitude: z.number().min(-180).max(180).optional(),
  is_active: z.boolean().optional(),
  is_primary_area: z.boolean().optional(),
  postal_codes: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
});

/**
 * The two coverage thresholds must stay ordered: `max_distance_km` (the
 * furthest a contractor will travel, billed at `per_km_rate`) cannot be
 * smaller than `radius_km` (the reach included in the price).
 *
 * Validated against the MERGED row rather than the request body, because
 * a PATCH may legitimately send either field on its own — checking the
 * body alone would wave through a request that lowers max_distance_km
 * below an unchanged radius_km.
 *
 * Exported for direct testing; the handler is the only caller.
 */
export function radiusPairError(
  patch: { radius_km?: number; max_distance_km?: number },
  existing: { radius_km?: number | null; max_distance_km?: number | null }
): string | null {
  // Only judge a patch that actually moves one of the thresholds. A row
  // that is already inconsistent must not become uneditable — blocking
  // an unrelated rename because of stored data the caller isn't touching
  // would strand the area with no way to fix it from the app.
  if (patch.radius_km == null && patch.max_distance_km == null) return null;

  const nextRadius = patch.radius_km ?? existing.radius_km;
  const nextMax = patch.max_distance_km ?? existing.max_distance_km;
  if (nextRadius == null || nextMax == null) return null;
  if (nextMax < nextRadius) {
    return 'max_distance_km must be greater than or equal to radius_km — the extended reach cannot be smaller than the standard radius';
  }
  return null;
}

/**
 * PATCH /api/contractor/service-areas/[id]
 * Update a service area (ownership verified)
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const id = (params as Record<string, string>)?.id;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing service area id' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateServiceAreaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership. radius_km / max_distance_km come back too so the
    // two thresholds can be validated against each other after merging —
    // a PATCH that moves only one of them still has to land on a
    // consistent row.
    const { data: existing } = await serverSupabase
      .from('service_areas')
      .select('id, radius_km, max_distance_km')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Service area not found');
    }

    const pairError = radiusPairError(parsed.data, existing);
    if (pairError) {
      return NextResponse.json({ error: pairError }, { status: 400 });
    }

    // If setting as primary, unset existing primary first
    if (parsed.data.is_primary_area === true) {
      await serverSupabase
        .from('service_areas')
        .update({ is_primary_area: false })
        .eq('contractor_id', user.id)
        .eq('is_primary_area', true)
        .neq('id', id);
    }

    const { data: updated, error } = await serverSupabase
      .from('service_areas')
      .update(parsed.data)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating service area', error);
      throw new InternalServerError('Failed to update service area');
    }

    return NextResponse.json({ success: true, data: updated });
  }
);

/**
 * DELETE /api/contractor/service-areas/[id]
 * Delete a service area (ownership verified)
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const id = (params as Record<string, string>)?.id;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing service area id' },
        { status: 400 }
      );
    }

    // Verify ownership before delete
    const { data: existing } = await serverSupabase
      .from('service_areas')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Service area not found');
    }

    const { error } = await serverSupabase
      .from('service_areas')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting service area', error);
      throw new InternalServerError('Failed to delete service area');
    }

    return NextResponse.json({ success: true });
  }
);
