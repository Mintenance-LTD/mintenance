/**
 * /api/properties/[id]/rooms
 *
 * GET  — list rooms for a property
 *           - owner OR team-view member can read
 *           - contractor with an active/completed job on that property
 *             can read (via the RLS policy property_rooms_contractor_read)
 *
 * POST — create a new room
 *           - owner OR team-edit member can create
 *           - body: { name, room_type, size_sqm?, notes? }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { isValidUUID } from '@/lib/validation/uuid';

export const ROOM_TYPES = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'dining_room',
  'garage',
  'garden',
  'exterior',
  'roof',
  'hallway',
  'office',
  'utility',
  'other',
] as const;

export const createRoomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Room name is required')
      .max(80, 'Room name must be 80 characters or fewer'),
    room_type: z.enum(ROOM_TYPES),
    size_sqm: z
      .number()
      .min(0, 'Size cannot be negative')
      .max(10000, 'Size looks unrealistically large')
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must be 500 characters or fewer')
      .optional()
      .nullable(),
  })
  .strict();

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Property not found');
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Owner / team-view check first — contractor RLS handles its own path
    // and will surface rooms via the RLS contractor_read policy.
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'view'
    );

    const isAdmin = user.role === 'admin';
    const isContractor = user.role === 'contractor';

    if (!authorized && !isAdmin && !isContractor) {
      // Homeowner who doesn't own this property — deny silently
      throw new NotFoundError('Property not found');
    }

    const { data, error } = await userDb
      .from('property_rooms')
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .eq('property_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch property rooms', {
        error: error.message,
        propertyId: params.id,
      });
      throw new InternalServerError('Failed to fetch rooms');
    }

    return NextResponse.json({ rooms: data ?? [] });
  }
);

export const POST = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 30 },
  },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Property not found');
    }

    // Edit-level authorisation
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

    const validation = await validateRequest(request, createRoomSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { name, room_type, size_sqm, notes } = validation.data;

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const { data, error } = await userDb
      .from('property_rooms')
      .insert({
        property_id: params.id,
        name,
        room_type,
        size_sqm: size_sqm ?? null,
        notes: notes ?? null,
      })
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .single();

    if (error) {
      logger.error('Failed to create property room', {
        error: error.message,
        propertyId: params.id,
        userId: user.id,
      });
      throw new InternalServerError('Failed to create room');
    }

    return NextResponse.json({ room: data }, { status: 201 });
  }
);
