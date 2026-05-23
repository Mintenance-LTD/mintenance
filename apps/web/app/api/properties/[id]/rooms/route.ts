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

    // 2026-05-23 audit-20 P2: previously this route ran the
    // PropertyTeamService.authorize() gate and THEN read through
    // `createRequestScopedClient` (RLS-bound to the caller). Live
    // property_rooms RLS only grants SELECT to owner OR
    // contractor-of-active-job — team members (manager / viewer) pass
    // the in-code authorize check then get `data: []` back. Same
    // pattern audit-14 #78 and audit-15 #84 adopted for property
    // access reads + properties detail GET: PropertyTeamService is
    // the authoritative gate, so service-role read is consistent.
    // Contractor RLS still covers the "contractor opens a job's
    // property" path via the dedicated contractor_read policy when
    // the request goes through the request-scoped client; we keep
    // userDb for that branch.
    void createRequestScopedClient;

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

    // Owner / admin / team-view all use service-role; contractor falls
    // back to RLS so the contractor_read policy gates by job status.
    const roomsClient =
      isContractor && !authorized
        ? (createRequestScopedClient(request) ?? serverSupabase)
        : serverSupabase;

    const { data, error } = await roomsClient
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

    // 2026-05-23 audit-20 P2: same RLS-detour rationale as the GET
    // branch — managers (team_edit) need to insert rooms but the
    // property_rooms RLS write policy only grants the owner.
    // PropertyTeamService.authorize('edit') above is the boundary.
    const { data, error } = await serverSupabase
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
