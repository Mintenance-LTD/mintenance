/**
 * POST /api/properties/[id]/rooms/seed
 *
 * Creates the property's rooms from the bedroom/bathroom counts already given
 * at property creation, plus the rooms nearly every dwelling has.
 *
 * Background: the add-property form collects `bedrooms` and `bathrooms` as
 * integers, but `property_rooms` rows are only ever created by hand on the
 * Rooms tab — so in production almost no property has any rooms recorded, and
 * anything room-scoped (room-scoped certificates, the per-room walkthrough)
 * has nothing to attach to. This turns the answer the user already gave into
 * real rows.
 *
 * Idempotent: if the property already has rooms it returns them untouched
 * rather than duplicating. Seeding is a starting point, not a source of
 * truth — the rooms are ordinary rows the owner can rename, delete or add to.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { isValidUUID } from '@/lib/validation/uuid';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
// Pure planner lives in ../seed-plan — App Router route files may only export
// handlers, and the mapping from counts to rooms is the testable part.
import { planSeedRooms } from '../seed-plan';

const SERVICE = 'property-rooms-seed';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Property not found');
    }

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to add rooms to this property'
      );
    }

    // Same RLS-detour rationale as the sibling rooms route: property_rooms
    // write policy grants the owner only, while team managers are authorised
    // above. PropertyTeamService is the boundary.
    const { data: existing, error: existingError } = await serverSupabase
      .from('property_rooms')
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .eq('property_id', params.id)
      .order('created_at', { ascending: true });

    if (existingError) {
      logger.error('Failed to read existing property rooms', {
        service: SERVICE,
        error: existingError.message,
        propertyId: params.id,
      });
      throw new InternalServerError('Failed to read rooms');
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ rooms: existing, seeded: 0 });
    }

    const { data: property, error: propertyError } = await serverSupabase
      .from('properties')
      .select('id, bedrooms, bathrooms')
      .eq('id', params.id)
      .maybeSingle();

    if (propertyError || !property) {
      throw new NotFoundError('Property not found');
    }

    const planned = planSeedRooms({
      bedrooms: property.bedrooms as number | null,
      bathrooms: property.bathrooms as number | null,
    });

    const { data: created, error: insertError } = await serverSupabase
      .from('property_rooms')
      .insert(
        planned.map((room) => ({
          property_id: params.id,
          name: room.name,
          room_type: room.room_type,
          size_sqm: null,
          notes: null,
        }))
      )
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at');

    if (insertError) {
      logger.error('Failed to seed property rooms', {
        service: SERVICE,
        error: insertError.message,
        propertyId: params.id,
        planned: planned.length,
      });
      throw new InternalServerError('Failed to create rooms');
    }

    logger.info('Property rooms seeded from counts', {
      service: SERVICE,
      propertyId: params.id,
      userId: user.id,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      seeded: created?.length ?? 0,
    });

    return NextResponse.json(
      { rooms: created ?? [], seeded: created?.length ?? 0 },
      { status: 201 }
    );
  }
);
