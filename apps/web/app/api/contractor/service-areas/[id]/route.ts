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
  center_latitude: z.number().min(-90).max(90).optional(),
  center_longitude: z.number().min(-180).max(180).optional(),
  is_active: z.boolean().optional(),
  is_primary_area: z.boolean().optional(),
  postal_codes: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
});

/**
 * PATCH /api/contractor/service-areas/[id]
 * Update a service area (ownership verified)
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const id = (params as Record<string, string>)?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing service area id' }, { status: 400 });
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

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('service_areas')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Service area not found');
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
      return NextResponse.json({ error: 'Missing service area id' }, { status: 400 });
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
